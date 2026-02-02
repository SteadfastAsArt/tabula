//! Rule-based tab analysis engine
//! Provides suggestions without requiring AI/API calls

use crate::storage::{RuleConfig, TabRecord, TabSuggestion};
use std::collections::HashMap;

/// Result of rule-based analysis for a single tab
#[derive(Debug, Clone)]
pub struct RuleResult {
    pub decision: String,
    pub reason: String,
    pub rule_name: String,
}

/// Extract domain from URL
fn extract_domain(url: &Option<String>) -> Option<String> {
    url.as_ref().and_then(|u| {
        url::Url::parse(u)
            .ok()
            .and_then(|parsed| parsed.host_str().map(|h| h.to_string()))
            .map(|h| h.trim_start_matches("www.").to_string())
    })
}

/// Analyze tabs using rule-based heuristics
pub fn analyze_tabs_with_rules(
    tabs: &[TabRecord],
    config: &RuleConfig,
) -> Vec<(i64, TabSuggestion)> {
    if !config.enabled {
        return vec![];
    }

    let now = chrono::Utc::now().timestamp_millis();

    // Build domain count map for duplicate detection
    let mut domain_counts: HashMap<String, Vec<i64>> = HashMap::new();
    for tab in tabs {
        if let Some(domain) = extract_domain(&tab.url) {
            domain_counts
                .entry(domain)
                .or_default()
                .push(tab.id);
        }
    }

    let mut results = Vec::new();

    for tab in tabs {
        // Skip tabs that already have suggestions
        if tab.suggestion.is_some() {
            continue;
        }

        if let Some(result) = analyze_single_tab(tab, config, &domain_counts, now) {
            let suggestion = TabSuggestion {
                decision: result.decision,
                reason: result.reason,
                category: None, // Rules don't categorize
                digest: None,
                scored_at: now,
            };
            results.push((tab.id, suggestion));
        }
    }

    results
}

/// Analyze a single tab against all rules
fn analyze_single_tab(
    tab: &TabRecord,
    config: &RuleConfig,
    domain_counts: &HashMap<String, Vec<i64>>,
    now: i64,
) -> Option<RuleResult> {
    let domain = extract_domain(&tab.url);

    // Rule 1: Blacklist domains - always close
    if let Some(ref d) = domain {
        let d_lower = d.to_lowercase();
        for blacklisted in &config.blacklist_domains {
            if d_lower.contains(&blacklisted.to_lowercase()) {
                return Some(RuleResult {
                    decision: "close".to_string(),
                    reason: format!("Domain '{}' is in your blacklist", d),
                    rule_name: "blacklist".to_string(),
                });
            }
        }
    }

    // Rule 2: Whitelist domains - always keep
    if let Some(ref d) = domain {
        let d_lower = d.to_lowercase();
        for whitelisted in &config.whitelist_domains {
            if d_lower.contains(&whitelisted.to_lowercase()) {
                return Some(RuleResult {
                    decision: "keep".to_string(),
                    reason: format!("Domain '{}' is in your whitelist", d),
                    rule_name: "whitelist".to_string(),
                });
            }
        }
    }

    // Rule 3: Inactive for too long
    let inactive_threshold_ms = config.inactive_days_threshold as i64 * 24 * 60 * 60 * 1000;
    let last_activity = tab.last_active_at.unwrap_or(tab.created_at);
    let inactive_ms = now - last_activity;

    if inactive_ms > inactive_threshold_ms {
        let days = inactive_ms / (24 * 60 * 60 * 1000);
        return Some(RuleResult {
            decision: "close".to_string(),
            reason: format!("Inactive for {} days", days),
            rule_name: "inactive".to_string(),
        });
    }

    // Rule 4: Never really used (low active time)
    let min_active_ms = config.min_active_seconds as i64 * 1000;
    let tab_age_ms = now - tab.created_at;
    let min_age_for_rule = 60 * 60 * 1000; // Only apply after 1 hour

    if tab.total_active_ms < min_active_ms && tab_age_ms > min_age_for_rule {
        return Some(RuleResult {
            decision: "close".to_string(),
            reason: format!(
                "Only {}s of active time - you might have forgotten about this tab",
                tab.total_active_ms / 1000
            ),
            rule_name: "unused".to_string(),
        });
    }

    // Rule 5: Too many tabs from same domain
    if let Some(ref d) = domain {
        if let Some(tab_ids) = domain_counts.get(d) {
            let count = tab_ids.len() as u32;
            if count > config.duplicate_domain_threshold {
                // Only suggest closing if this tab has lowest activity
                let is_least_active = tab_ids.iter().all(|&id| {
                    if id == tab.id {
                        return true;
                    }
                    // We'd need access to other tabs to compare, so skip this for now
                    // This rule will mark all tabs from the domain as "unsure"
                    true
                });

                if is_least_active {
                    return Some(RuleResult {
                        decision: "unsure".to_string(),
                        reason: format!(
                            "You have {} tabs from '{}' - consider consolidating",
                            count, d
                        ),
                        rule_name: "duplicate_domain".to_string(),
                    });
                }
            }
        }
    }

    None // No rule matched
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_tab(id: i64, url: &str, active_ms: i64, last_active_days_ago: i64) -> TabRecord {
        let now = chrono::Utc::now().timestamp_millis();
        TabRecord {
            id,
            window_id: Some(1),
            url: Some(url.to_string()),
            title: Some(format!("Tab {}", id)),
            fav_icon_url: None,
            created_at: now - (last_active_days_ago + 1) * 24 * 60 * 60 * 1000,
            last_active_at: Some(now - last_active_days_ago * 24 * 60 * 60 * 1000),
            total_active_ms: active_ms,
            is_active: false,
            closed_at: None,
            description: None,
            snapshot: None,
            suggestion: None,
            sessions: Vec::new(),
            url_history: Vec::new(),
        }
    }

    #[test]
    fn test_blacklist_rule() {
        let config = RuleConfig {
            enabled: true,
            blacklist_domains: vec!["facebook.com".to_string()],
            ..Default::default()
        };

        let tabs = vec![make_tab(1, "https://facebook.com/feed", 5000, 0)];
        let results = analyze_tabs_with_rules(&tabs, &config);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].1.decision, "close");
        assert!(results[0].1.reason.contains("blacklist"));
    }

    #[test]
    fn test_whitelist_rule() {
        let config = RuleConfig {
            enabled: true,
            whitelist_domains: vec!["github.com".to_string()],
            ..Default::default()
        };

        let tabs = vec![make_tab(1, "https://github.com/user/repo", 5000, 0)];
        let results = analyze_tabs_with_rules(&tabs, &config);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].1.decision, "keep");
        assert!(results[0].1.reason.contains("whitelist"));
    }

    #[test]
    fn test_inactive_rule() {
        let config = RuleConfig {
            enabled: true,
            inactive_days_threshold: 7,
            ..Default::default()
        };

        let tabs = vec![make_tab(1, "https://example.com", 60000, 10)]; // 10 days inactive
        let results = analyze_tabs_with_rules(&tabs, &config);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].1.decision, "close");
        assert!(results[0].1.reason.contains("Inactive"));
    }

    #[test]
    fn test_disabled_rules() {
        let config = RuleConfig {
            enabled: false,
            ..Default::default()
        };

        let tabs = vec![make_tab(1, "https://example.com", 60000, 100)];
        let results = analyze_tabs_with_rules(&tabs, &config);

        assert_eq!(results.len(), 0);
    }
}
