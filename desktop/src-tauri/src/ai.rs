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

    let client = Client::new();
    let request = ChatRequest {
        model,
        messages,
        temperature,
    };

    let response = client
        .post(format!("{}/chat/completions", base_url))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error: {}", error_text));
    }

    let chat_response: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    chat_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or_else(|| "No response from API".to_string())
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

    if let Some(snapshot) = &tab.snapshot {
        if let Some(text) = &snapshot.text {
            // Limit text length
            let truncated = if text.len() > 2000 {
                format!("{}...", &text[..2000])
            } else {
                text.clone()
            };
            lines.push(format!("content: {}", truncated));
        }
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
                    scored_at: now,
                },
            )
        })
        .collect())
}

pub async fn generate_daily_report(tabs: &[TabRecord], settings: &Settings) -> Result<String, String> {
    if tabs.is_empty() {
        return Ok("No tabs to report on.".to_string());
    }

    let tab_list: Vec<String> = tabs
        .iter()
        .map(|tab| {
            format!(
                "- {} ({}) activeMs={}",
                tab.title.as_deref().unwrap_or("Untitled"),
                tab.url.as_deref().unwrap_or("no url"),
                tab.total_active_ms
            )
        })
        .collect();

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: serde_json::json!("You summarize browsing activity as a daily report with key themes, tasks, and next actions. Be concise and actionable."),
        },
        ChatMessage {
            role: "user".to_string(),
            content: serde_json::json!(format!(
                "Generate a concise daily report for {} based on opened tabs.\nInclude: main themes, completed work, open questions, and suggested follow-ups.\n\nTabs:\n{}",
                today,
                tab_list.join("\n")
            )),
        },
    ];

    call_openai(settings, messages, 0.3).await
}
