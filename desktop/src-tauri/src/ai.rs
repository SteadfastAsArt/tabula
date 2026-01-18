use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;

use crate::storage::{Settings, TabRecord, TabSuggestion};

const DEFAULT_MODEL: &str = "gpt-4o-mini";
const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessageResponse,
}

#[derive(Debug, Deserialize)]
struct ChatMessageResponse {
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct SuggestionItem {
    #[serde(rename = "tabId")]
    tab_id: i64,
    category: Option<String>,
    decision: String,
    reason: String,
    digest: Option<String>,
}

fn get_api_key(settings: &Settings) -> Result<String, String> {
    settings
        .openai_api_key
        .clone()
        .filter(|k| !k.is_empty())
        .ok_or_else(|| "Missing OpenAI API key. Please configure it in settings.".to_string())
}

fn get_base_url(settings: &Settings) -> String {
    settings
        .base_url
        .clone()
        .filter(|u| !u.is_empty())
        .unwrap_or_else(|| DEFAULT_BASE_URL.to_string())
}

fn get_model(settings: &Settings) -> String {
    settings
        .model
        .clone()
        .filter(|m| !m.is_empty())
        .unwrap_or_else(|| DEFAULT_MODEL.to_string())
}

async fn call_openai(
    settings: &Settings,
    messages: Vec<ChatMessage>,
    temperature: f32,
) -> Result<String, String> {
    let api_key = get_api_key(settings)?;
    let base_url = get_base_url(settings);
    let model = get_model(settings);

    // Log request details
    let request_body = serde_json::to_string(&messages).unwrap_or_default();
    let request_size = request_body.len();
    let image_count = request_body.matches("image_url").count();
    
    // Count words (split by whitespace)
    let word_count: usize = messages.iter().map(|msg| {
        let content_str = serde_json::to_string(&msg.content).unwrap_or_default();
        // Remove base64 image data before counting words
        let without_base64 = content_str.split("base64,").next().unwrap_or(&content_str);
        without_base64.split_whitespace().count()
    }).sum();
    
    println!("\n[AI] ========== Request Start ==========");
    println!("[AI] Model: {}", model);
    println!("[AI] Base URL: {}", base_url);
    println!("[AI] Temperature: {}", temperature);
    println!("[AI] Messages count: {}", messages.len());
    println!("[AI] Request body size: {} bytes ({:.2} KB)", request_size, request_size as f64 / 1024.0);
    println!("[AI] Word count (excluding base64): ~{} words", word_count);
    println!("[AI] Image count: {}", image_count);
    
    // Print full message content
    for (i, msg) in messages.iter().enumerate() {
        let content_str = serde_json::to_string_pretty(&msg.content).unwrap_or_default();
        // For content with images, truncate base64 data for readability
        let display_content = if content_str.contains("base64,") {
            let mut result = String::new();
            for part in content_str.split("base64,") {
                if result.is_empty() {
                    result.push_str(part);
                } else {
                    // Find where the base64 data ends (at the next quote)
                    if let Some(end_idx) = part.find('"') {
                        result.push_str("base64,[IMAGE_DATA_TRUNCATED]");
                        result.push_str(&part[end_idx..]);
                    } else {
                        result.push_str("base64,[IMAGE_DATA_TRUNCATED]");
                    }
                }
            }
            result
        } else {
            content_str
        };
        println!("[AI] Message[{}] role={}:\n{}", i, msg.role, display_content);
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))  // 2 minutes timeout
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    let request = ChatRequest {
        model: model.clone(),
        messages,
        temperature,
    };

    let start_time = std::time::Instant::now();
    println!("[AI] Sending request...");

    let response = client
        .post(format!("{}/chat/completions", base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            println!("[AI] Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

    let elapsed = start_time.elapsed();
    let status = response.status();
    println!("[AI] Response status: {} (took {:.2}s)", status, elapsed.as_secs_f64());

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        println!("[AI] API error: {}", error_text);
        return Err(format!("API error: {}", error_text));
    }

    let chat_response: ChatResponse = response
        .json()
        .await
        .map_err(|e| {
            println!("[AI] Failed to parse response: {}", e);
            format!("Failed to parse response: {}", e)
        })?;

    let result = chat_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or_else(|| "No response from API".to_string())?;

    let response_word_count = result.split_whitespace().count();
    println!("[AI] Response: {} words, {} bytes", response_word_count, result.len());
    println!("[AI] ========== Request End (total {:.2}s) ==========\n", start_time.elapsed().as_secs_f64());

    Ok(result)
}

fn format_tab_for_prompt(tab: &TabRecord) -> String {
    let mut lines = vec![
        format!("tabId: {}", tab.id),
        format!("title: {}", tab.title.as_deref().unwrap_or("")),
        format!("url: {}", tab.url.as_deref().unwrap_or("")),
        format!("createdAt: {}", tab.created_at),
        format!("lastActiveAt: {:?}", tab.last_active_at),
        format!("totalActiveMs: {}", tab.total_active_ms),
    ];

    // Use description from TabRecord (extracted from page meta/content)
    if let Some(desc) = &tab.description {
        // Limit description length for prompt (use char count for UTF-8 safety)
        let truncated = truncate_str(desc, 3000);
        lines.push(format!("content: {}", truncated));
    }

    lines.join("\n")
}

fn extract_json_array(content: &str) -> Result<Vec<SuggestionItem>, String> {
    // Find JSON array in response
    let start = content.find('[').ok_or("No JSON array found")?;
    let end = content.rfind(']').ok_or("No closing bracket found")? + 1;
    let json_str = &content[start..end];

    serde_json::from_str(json_str).map_err(|e| format!("Failed to parse JSON: {}", e))
}

const TAB_CATEGORIES: &str = r#"
Categories to classify tabs:
- work: Work-related tasks, projects, documentation
- research: Learning, tutorials, technical documentation
- communication: Email, chat, social media
- entertainment: Videos, games, news, casual browsing
- shopping: E-commerce, product research
- reference: Bookmarked pages, tools kept open for reference
- utility: Settings, admin panels, dev tools
"#;

pub async fn suggest_tabs(
    tabs: &[TabRecord],
    settings: &Settings,
) -> Result<HashMap<i64, TabSuggestion>, String> {
    if tabs.is_empty() {
        return Ok(HashMap::new());
    }

    // Use all tabs passed in - batch size is already controlled by the caller
    let tabs_to_analyze: Vec<_> = tabs.iter().collect();

    // Build user context if available
    let user_context_str = settings
        .user_context
        .as_ref()
        .filter(|s| !s.is_empty())
        .map(|ctx| format!("\n\nUser's context and preferences:\n{}", ctx))
        .unwrap_or_default();

    // Build content with text and images
    let prompt = format!(
        r#"Analyze these browser tabs and suggest which to keep or close.

{}
{}

Return JSON array only. Each item must have:
- "tabId": number
- "category": one of [work, research, communication, entertainment, shopping, reference, utility]
- "decision": "keep" | "close" | "unsure"
- "reason": brief explanation
- "digest": a concise 1-2 sentence summary of the tab's content/purpose (in the same language as the page content)

Base decisions on:
1. Tab's relevance to user's current work/goals
2. How recently it was active
3. Whether the content is transient or worth keeping
4. Category - entertainment tabs idle for long are good candidates to close"#,
        TAB_CATEGORIES,
        user_context_str
    );

    let mut content_parts: Vec<serde_json::Value> = vec![serde_json::json!({
        "type": "text",
        "text": prompt
    })];

    for tab in &tabs_to_analyze {
        content_parts.push(serde_json::json!({
            "type": "text",
            "text": format!("\n\n{}", format_tab_for_prompt(tab))
        }));

        // Add screenshot if available
        if let Some(snapshot) = &tab.snapshot {
            if let Some(path) = &snapshot.screenshot_path {
                if let Ok(bytes) = fs::read(path) {
                    let base64 = base64::Engine::encode(
                        &base64::engine::general_purpose::STANDARD,
                        &bytes,
                    );
                    content_parts.push(serde_json::json!({
                        "type": "image_url",
                        "image_url": {
                            "url": format!("data:image/jpeg;base64,{}", base64),
                            "detail": "low"
                        }
                    }));
                }
            }
        }
    }

    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: serde_json::json!("You are a tab cleanup assistant. Classify and decide whether each tab should be kept, closed, or is unsure. Consider the user's context and work habits."),
        },
        ChatMessage {
            role: "user".to_string(),
            content: serde_json::Value::Array(content_parts),
        },
    ];

    let response = call_openai(settings, messages, 0.2).await?;
    let suggestions = extract_json_array(&response)?;

    let now = chrono::Utc::now().timestamp_millis();
    Ok(suggestions
        .into_iter()
        .map(|s| {
            (
                s.tab_id,
                TabSuggestion {
                    decision: s.decision,
                    reason: s.reason,
                    category: s.category,
                    digest: s.digest,
                    scored_at: now,
                },
            )
        })
        .collect())
}

fn extract_domain(url: &str) -> String {
    url.split("://")
        .nth(1)
        .and_then(|s| s.split('/').next())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

/// Safely truncate a string to approximately max_chars characters
/// Handles UTF-8 character boundaries correctly
fn truncate_str(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(max_chars).collect();
        format!("{}...", truncated)
    }
}

pub async fn generate_daily_report(tabs: &[TabRecord], settings: &Settings) -> Result<String, String> {
    println!("\n[AI Report] ========== Generate Daily Report ==========");
    
    if tabs.is_empty() {
        println!("[AI Report] No tabs to report on.");
        return Ok("No tabs to report on.".to_string());
    }

    // Stats for logging
    let tabs_with_suggestion = tabs.iter().filter(|t| t.suggestion.is_some()).count();
    let tabs_with_digest = tabs.iter().filter(|t| t.suggestion.as_ref().and_then(|s| s.digest.as_ref()).is_some()).count();
    let tabs_with_description = tabs.iter().filter(|t| t.description.is_some()).count();
    
    println!("[AI Report] Total tabs: {}", tabs.len());
    println!("[AI Report] Tabs with suggestion: {}", tabs_with_suggestion);
    println!("[AI Report] Tabs with digest: {}", tabs_with_digest);
    println!("[AI Report] Tabs with description: {}", tabs_with_description);

    // Group tabs by domain
    let mut domain_groups: std::collections::HashMap<String, Vec<&TabRecord>> = std::collections::HashMap::new();
    for tab in tabs {
        let domain = tab.url.as_deref().map(extract_domain).unwrap_or_else(|| "unknown".to_string());
        domain_groups.entry(domain).or_default().push(tab);
    }
    
    println!("[AI Report] Domains: {}", domain_groups.len());
    for (domain, domain_tabs) in &domain_groups {
        println!("[AI Report]   - {}: {} tabs", domain, domain_tabs.len());
    }

    // Format grouped tabs
    let grouped_list: Vec<String> = domain_groups
        .iter()
        .map(|(domain, domain_tabs)| {
            let tabs_info: Vec<String> = domain_tabs
                .iter()
                .map(|tab| {
                    let title = tab.title.as_deref().unwrap_or("Untitled");
                    let active_time = tab.total_active_ms;
                    
                    // Use category + digest from suggestion, fallback to description
                    let content = if let Some(suggestion) = &tab.suggestion {
                        let category = suggestion.category.as_deref().unwrap_or("uncategorized");
                        let summary = suggestion.digest.as_deref()
                            .or(tab.description.as_deref())
                            .map(|d| truncate_str(d, 300))
                            .unwrap_or_default();
                        if summary.is_empty() {
                            format!("[{}]", category)
                        } else {
                            format!("[{}] {}", category, summary)
                        }
                    } else {
                        // No suggestion, use description
                        tab.description.as_deref()
                            .map(|d| truncate_str(d, 300))
                            .unwrap_or_default()
                    };
                    
                    if content.is_empty() {
                        format!("  - {} ({}ms)", title, active_time)
                    } else {
                        format!("  - {} ({}ms)\n    {}", title, active_time, content)
                    }
                })
                .collect();
            
            format!("## {}\n{}", domain, tabs_info.join("\n"))
        })
        .collect();

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    
    // Build user context if available
    let user_context_str = settings
        .user_context
        .as_ref()
        .filter(|s| !s.is_empty())
        .map(|ctx| format!("\n\nUser's context and work preferences:\n{}", ctx))
        .unwrap_or_default();

    // Build prompt content
    let prompt_content = format!(
        "Generate a concise daily report for {} based on the user's browsing activity.\n\nInclude:\n- Main themes and topics\n- Key activities and progress\n- Open questions or unfinished tasks\n- Suggested follow-ups for tomorrow{}\n\nBrowsing activity grouped by domain:\n\n{}",
        today,
        user_context_str,
        grouped_list.join("\n\n")
    );
    
    let system_content = "You summarize browsing activity as a daily report with key themes, tasks, and next actions. Be concise and actionable. Use markdown formatting. The input is grouped by domain, each tab has a title, active time, and optionally a category tag with content summary.";
    
    // Log complete messages
    let prompt_word_count = prompt_content.split_whitespace().count();
    println!("[AI Report] -------- Messages --------");
    println!("[AI Report] System message ({} words):\n{}", system_content.split_whitespace().count(), system_content);
    println!("[AI Report] --------");
    println!("[AI Report] User message ({} words):\n{}", prompt_word_count, prompt_content);
    println!("[AI Report] -------- End Messages --------");

    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: serde_json::json!(system_content),
        },
        ChatMessage {
            role: "user".to_string(),
            content: serde_json::json!(prompt_content),
        },
    ];

    println!("[AI Report] Calling OpenAI API...");
    let result = call_openai(settings, messages, 0.3).await;
    
    match &result {
        Ok(content) => {
            println!("[AI Report] Report generated successfully ({} words)", content.split_whitespace().count());
            println!("[AI Report] Response:\n{}", content);
        }
        Err(e) => {
            println!("[AI Report] Failed to generate report: {}", e);
        }
    }
    println!("[AI Report] ========== End Daily Report ==========\n");
    
    result
}
