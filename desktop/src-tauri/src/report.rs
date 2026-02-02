//! Enhanced Daily Report Generation
//! Provides visualization data, trends, and action items

use crate::storage::{
    ActionItem, CategoryTimeData, DailyReport, DomainTimeData, HourlyActivity,
    Storage, TabRecord, TrendData,
};
use chrono::Timelike;
use std::collections::HashMap;

/// Extract domain from URL
fn extract_domain(url: &Option<String>) -> String {
    url.as_ref()
        .and_then(|u| {
            url::Url::parse(u)
                .ok()
                .and_then(|parsed| parsed.host_str().map(|h| h.to_string()))
                .map(|h| h.trim_start_matches("www.").to_string())
        })
        .unwrap_or_else(|| "unknown".to_string())
}

/// Calculate category time distribution
pub fn calculate_category_time(tabs: &[TabRecord]) -> Vec<CategoryTimeData> {
    let mut category_map: HashMap<String, (i64, u32)> = HashMap::new();

    for tab in tabs {
        let category = tab
            .suggestion
            .as_ref()
            .and_then(|s| s.category.clone())
            .unwrap_or_else(|| "uncategorized".to_string());

        let entry = category_map.entry(category).or_insert((0, 0));
        entry.0 += tab.total_active_ms;
        entry.1 += 1;
    }

    let mut result: Vec<CategoryTimeData> = category_map
        .into_iter()
        .map(|(category, (time_ms, tab_count))| CategoryTimeData {
            category,
            time_ms,
            tab_count,
        })
        .collect();

    // Sort by time descending
    result.sort_by(|a, b| b.time_ms.cmp(&a.time_ms));
    result
}

/// Calculate domain time distribution
pub fn calculate_domain_time(tabs: &[TabRecord]) -> Vec<DomainTimeData> {
    let mut domain_map: HashMap<String, (i64, u32)> = HashMap::new();

    for tab in tabs {
        let domain = extract_domain(&tab.url);
        let entry = domain_map.entry(domain).or_insert((0, 0));
        entry.0 += tab.total_active_ms;
        entry.1 += 1;
    }

    let mut result: Vec<DomainTimeData> = domain_map
        .into_iter()
        .map(|(domain, (time_ms, tab_count))| DomainTimeData {
            domain,
            time_ms,
            tab_count,
        })
        .collect();

    // Sort by time descending, take top 10
    result.sort_by(|a, b| b.time_ms.cmp(&a.time_ms));
    result.truncate(10);
    result
}

/// Calculate hourly activity (simplified - based on tab activity times)
pub fn calculate_hourly_activity(tabs: &[TabRecord]) -> Vec<HourlyActivity> {
    let mut hourly: Vec<HourlyActivity> = (0..24)
        .map(|hour| HourlyActivity {
            hour,
            time_ms: 0,
            tab_switches: 0,
        })
        .collect();

    for tab in tabs {
        // Use last_active_at to determine hour of activity
        if let Some(last_active) = tab.last_active_at {
            let dt = chrono::DateTime::from_timestamp_millis(last_active);
            if let Some(dt) = dt {
                let hour = dt.hour() as usize;
                if hour < 24 {
                    hourly[hour].time_ms += tab.total_active_ms / 24; // Approximate distribution
                    hourly[hour].tab_switches += 1;
                }
            }
        }

        // Also check sessions for more accurate data
        for session in &tab.sessions {
            let dt = chrono::DateTime::from_timestamp_millis(session.started_at);
            if let Some(dt) = dt {
                let hour = dt.hour() as usize;
                if hour < 24 {
                    hourly[hour].time_ms += session.duration_ms;
                    hourly[hour].tab_switches += 1;
                }
            }
        }
    }

    hourly
}

/// Calculate trend data comparing today vs yesterday
pub fn calculate_trends(storage: &Storage, today_tabs: &[TabRecord]) -> TrendData {
    let now = chrono::Utc::now();
    let today_start = now
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc()
        .timestamp_millis();
    let yesterday_start = today_start - 24 * 60 * 60 * 1000;

    // Today's stats
    let total_time_today: i64 = today_tabs.iter().map(|t| t.total_active_ms).sum();
    let tabs_opened_today = today_tabs
        .iter()
        .filter(|t| t.created_at >= today_start)
        .count() as u32;
    let tabs_closed_today = today_tabs
        .iter()
        .filter(|t| t.closed_at.map(|c| c >= today_start).unwrap_or(false))
        .count() as u32;

    // Yesterday's tabs (from all tabs, filter by yesterday's activity)
    let yesterday_tabs: Vec<&TabRecord> = storage
        .tabs
        .values()
        .filter(|t| {
            t.last_active_at
                .map(|la| la >= yesterday_start && la < today_start)
                .unwrap_or(false)
        })
        .collect();

    let total_time_yesterday: i64 = yesterday_tabs.iter().map(|t| t.total_active_ms).sum();
    let tabs_opened_yesterday = yesterday_tabs
        .iter()
        .filter(|t| t.created_at >= yesterday_start && t.created_at < today_start)
        .count() as u32;
    let tabs_closed_yesterday = yesterday_tabs
        .iter()
        .filter(|t| {
            t.closed_at
                .map(|c| c >= yesterday_start && c < today_start)
                .unwrap_or(false)
        })
        .count() as u32;

    // Top category today
    let category_time = calculate_category_time(today_tabs);
    let top_category_today = category_time.first().map(|c| c.category.clone());

    // Top category yesterday
    let yesterday_records: Vec<TabRecord> = yesterday_tabs.into_iter().cloned().collect();
    let yesterday_category_time = calculate_category_time(&yesterday_records);
    let top_category_yesterday = yesterday_category_time.first().map(|c| c.category.clone());

    TrendData {
        total_time_today,
        total_time_yesterday,
        tabs_opened_today,
        tabs_opened_yesterday,
        tabs_closed_today,
        tabs_closed_yesterday,
        top_category_today,
        top_category_yesterday,
    }
}

/// Generate action items based on browsing patterns
pub fn generate_action_items(tabs: &[TabRecord]) -> Vec<ActionItem> {
    let mut actions = Vec::new();
    let now = chrono::Utc::now().timestamp_millis();

    // Find tabs that have been open for too long with little activity
    let stale_tabs: Vec<&TabRecord> = tabs
        .iter()
        .filter(|t| {
            let age_days = (now - t.created_at) / (24 * 60 * 60 * 1000);
            let active_mins = t.total_active_ms / 60000;
            t.closed_at.is_none() && age_days > 7 && active_mins < 5
        })
        .collect();

    if !stale_tabs.is_empty() {
        actions.push(ActionItem {
            priority: "high".to_string(),
            action: format!("Review {} stale tabs that have been open for over a week with minimal activity", stale_tabs.len()),
            reason: "These tabs may be cluttering your browser without providing value".to_string(),
            related_tabs: stale_tabs.iter().map(|t| t.id).collect(),
        });
    }

    // Find domains with too many tabs
    let mut domain_counts: HashMap<String, Vec<i64>> = HashMap::new();
    for tab in tabs.iter().filter(|t| t.closed_at.is_none()) {
        let domain = extract_domain(&tab.url);
        domain_counts.entry(domain).or_default().push(tab.id);
    }

    for (domain, tab_ids) in domain_counts.iter() {
        if tab_ids.len() > 5 {
            actions.push(ActionItem {
                priority: "medium".to_string(),
                action: format!("Consolidate {} tabs from {}", tab_ids.len(), domain),
                reason: "Having many tabs from the same domain may indicate unfinished research or task switching".to_string(),
                related_tabs: tab_ids.clone(),
            });
        }
    }

    // Find entertainment tabs with high time
    let entertainment_heavy: Vec<&TabRecord> = tabs
        .iter()
        .filter(|t| {
            t.suggestion
                .as_ref()
                .and_then(|s| s.category.as_ref())
                .map(|c| c == "entertainment")
                .unwrap_or(false)
                && t.total_active_ms > 30 * 60 * 1000 // More than 30 mins
        })
        .collect();

    if !entertainment_heavy.is_empty() {
        let total_time: i64 = entertainment_heavy.iter().map(|t| t.total_active_ms).sum();
        let hours = total_time / (60 * 60 * 1000);
        actions.push(ActionItem {
            priority: "low".to_string(),
            action: format!("{}+ hours spent on entertainment today", hours),
            reason: "Consider setting time limits if this affects productivity".to_string(),
            related_tabs: entertainment_heavy.iter().map(|t| t.id).collect(),
        });
    }

    // Find work tabs that need follow-up (open but not recently active)
    let work_followup: Vec<&TabRecord> = tabs
        .iter()
        .filter(|t| {
            let is_work = t
                .suggestion
                .as_ref()
                .and_then(|s| s.category.as_ref())
                .map(|c| c == "work" || c == "research")
                .unwrap_or(false);
            let inactive_hours = t
                .last_active_at
                .map(|la| (now - la) / (60 * 60 * 1000))
                .unwrap_or(0);
            t.closed_at.is_none() && is_work && inactive_hours > 4 && inactive_hours < 48
        })
        .collect();

    if !work_followup.is_empty() {
        actions.push(ActionItem {
            priority: "medium".to_string(),
            action: format!("{} work/research tabs may need follow-up", work_followup.len()),
            reason: "These tabs haven't been active recently but may contain unfinished work".to_string(),
            related_tabs: work_followup.iter().map(|t| t.id).collect(),
        });
    }

    // Sort by priority
    actions.sort_by(|a, b| {
        let priority_order = |p: &str| match p {
            "high" => 0,
            "medium" => 1,
            "low" => 2,
            _ => 3,
        };
        priority_order(&a.priority).cmp(&priority_order(&b.priority))
    });

    actions
}

/// Generate the complete enhanced daily report
pub fn generate_enhanced_report(storage: &Storage, ai_content: String) -> DailyReport {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let now = chrono::Utc::now().timestamp_millis();

    // Get today's tabs (active today or created today)
    let today_start = chrono::Local::now()
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc()
        .timestamp_millis();

    let today_tabs: Vec<TabRecord> = storage
        .tabs
        .values()
        .filter(|t| {
            t.created_at >= today_start
                || t.last_active_at
                    .map(|la| la >= today_start)
                    .unwrap_or(false)
        })
        .cloned()
        .collect();

    let category_time = calculate_category_time(&today_tabs);
    let hourly_activity = calculate_hourly_activity(&today_tabs);
    let domain_time = calculate_domain_time(&today_tabs);
    let trends = Some(calculate_trends(storage, &today_tabs));
    let action_items = generate_action_items(&today_tabs);

    DailyReport {
        date: today,
        content: ai_content,
        generated_at: now,
        category_time,
        hourly_activity,
        domain_time,
        trends,
        action_items,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_tab(id: i64, category: Option<&str>, time_ms: i64) -> TabRecord {
        TabRecord {
            id,
            window_id: Some(1),
            url: Some("https://example.com".to_string()),
            title: Some(format!("Tab {}", id)),
            fav_icon_url: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            last_active_at: Some(chrono::Utc::now().timestamp_millis()),
            total_active_ms: time_ms,
            is_active: false,
            closed_at: None,
            description: None,
            snapshot: None,
            suggestion: category.map(|c| crate::storage::TabSuggestion {
                decision: "keep".to_string(),
                reason: "test".to_string(),
                category: Some(c.to_string()),
                digest: None,
                scored_at: 0,
            }),
            sessions: Vec::new(),
            url_history: Vec::new(),
        }
    }

    #[test]
    fn test_category_time_calculation() {
        let tabs = vec![
            make_test_tab(1, Some("work"), 60000),
            make_test_tab(2, Some("work"), 30000),
            make_test_tab(3, Some("entertainment"), 120000),
        ];

        let result = calculate_category_time(&tabs);

        assert_eq!(result.len(), 2);
        // Entertainment has more time, should be first
        assert_eq!(result[0].category, "entertainment");
        assert_eq!(result[0].time_ms, 120000);
        assert_eq!(result[0].tab_count, 1);
        // Work is second
        assert_eq!(result[1].category, "work");
        assert_eq!(result[1].time_ms, 90000);
        assert_eq!(result[1].tab_count, 2);
    }

    #[test]
    fn test_hourly_activity() {
        let tabs = vec![make_test_tab(1, None, 60000)];
        let result = calculate_hourly_activity(&tabs);

        assert_eq!(result.len(), 24);
        // Should have some activity in the current hour
        let total_activity: i64 = result.iter().map(|h| h.time_ms).sum();
        assert!(total_activity > 0);
    }
}
