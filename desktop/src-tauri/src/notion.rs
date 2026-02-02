//! Notion Integration
//! Export daily reports and tab data to Notion

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::storage::{DailyReport, Settings};

const NOTION_API_VERSION: &str = "2022-06-28";
const NOTION_API_BASE: &str = "https://api.notion.com/v1";

#[derive(Debug, Serialize)]
struct NotionRichText {
    #[serde(rename = "type")]
    text_type: String,
    text: NotionTextContent,
}

#[derive(Debug, Serialize)]
struct NotionTextContent {
    content: String,
}

#[derive(Debug, Serialize)]
struct NotionTitle {
    title: Vec<NotionRichText>,
}

#[derive(Debug, Serialize)]
struct NotionDate {
    date: NotionDateValue,
}

#[derive(Debug, Serialize)]
struct NotionDateValue {
    start: String,
}

#[derive(Debug, Serialize)]
struct NotionPageProperties {
    #[serde(rename = "Name")]
    name: NotionTitle,
    #[serde(rename = "Date")]
    date: NotionDate,
}

#[derive(Debug, Serialize)]
struct NotionBlock {
    object: String,
    #[serde(rename = "type")]
    block_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    heading_2: Option<NotionHeading>,
    #[serde(skip_serializing_if = "Option::is_none")]
    paragraph: Option<NotionParagraph>,
    #[serde(skip_serializing_if = "Option::is_none")]
    bulleted_list_item: Option<NotionParagraph>,
}

#[derive(Debug, Serialize)]
struct NotionHeading {
    rich_text: Vec<NotionRichText>,
}

#[derive(Debug, Serialize)]
struct NotionParagraph {
    rich_text: Vec<NotionRichText>,
}

#[derive(Debug, Serialize)]
struct CreatePageRequest {
    parent: NotionParent,
    properties: NotionPageProperties,
    children: Vec<NotionBlock>,
}

#[derive(Debug, Serialize)]
struct NotionParent {
    database_id: String,
}

#[derive(Debug, Deserialize)]
struct NotionPageResponse {
    id: String,
    url: String,
}

#[derive(Debug, Deserialize)]
struct NotionError {
    message: String,
}

/// Create a rich text block
fn rich_text(content: &str) -> Vec<NotionRichText> {
    // Notion has a 2000 character limit per rich text block
    let chunks: Vec<&str> = content
        .as_bytes()
        .chunks(2000)
        .map(|chunk| std::str::from_utf8(chunk).unwrap_or(""))
        .collect();

    chunks
        .into_iter()
        .map(|c| NotionRichText {
            text_type: "text".to_string(),
            text: NotionTextContent {
                content: c.to_string(),
            },
        })
        .collect()
}

/// Create a heading block
fn heading_block(text: &str) -> NotionBlock {
    NotionBlock {
        object: "block".to_string(),
        block_type: "heading_2".to_string(),
        heading_2: Some(NotionHeading {
            rich_text: rich_text(text),
        }),
        paragraph: None,
        bulleted_list_item: None,
    }
}

/// Create a paragraph block
fn paragraph_block(text: &str) -> NotionBlock {
    NotionBlock {
        object: "block".to_string(),
        block_type: "paragraph".to_string(),
        heading_2: None,
        paragraph: Some(NotionParagraph {
            rich_text: rich_text(text),
        }),
        bulleted_list_item: None,
    }
}

/// Create a bullet point block
fn bullet_block(text: &str) -> NotionBlock {
    NotionBlock {
        object: "block".to_string(),
        block_type: "bulleted_list_item".to_string(),
        heading_2: None,
        paragraph: None,
        bulleted_list_item: Some(NotionParagraph {
            rich_text: rich_text(text),
        }),
    }
}

/// Convert markdown-like content to Notion blocks
fn content_to_blocks(content: &str) -> Vec<NotionBlock> {
    let mut blocks = Vec::new();

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed.is_empty() {
            continue;
        }

        // Heading detection
        if trimmed.starts_with("## ") {
            blocks.push(heading_block(&trimmed[3..]));
        } else if trimmed.starts_with("# ") {
            blocks.push(heading_block(&trimmed[2..]));
        }
        // Bullet points
        else if trimmed.starts_with("- ") || trimmed.starts_with("* ") {
            blocks.push(bullet_block(&trimmed[2..]));
        }
        // Regular paragraph
        else {
            blocks.push(paragraph_block(trimmed));
        }
    }

    blocks
}

/// Export a daily report to Notion
pub async fn export_report_to_notion(
    report: &DailyReport,
    settings: &Settings,
) -> Result<String, String> {
    let api_key = settings
        .notion_api_key
        .as_ref()
        .filter(|k| !k.is_empty())
        .ok_or("Notion API key not configured")?;

    let database_id = settings
        .notion_database_id
        .as_ref()
        .filter(|d| !d.is_empty())
        .ok_or("Notion database ID not configured")?;

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Build content blocks
    let mut blocks = Vec::new();

    // Add AI content
    blocks.extend(content_to_blocks(&report.content));

    // Add visualization summary if available
    if let Some(trends) = &report.trends {
        blocks.push(heading_block("Today's Summary"));
        blocks.push(bullet_block(&format!(
            "Active Time: {} (yesterday: {})",
            format_duration(trends.total_time_today),
            format_duration(trends.total_time_yesterday)
        )));
        blocks.push(bullet_block(&format!(
            "Tabs Opened: {} (yesterday: {})",
            trends.tabs_opened_today, trends.tabs_opened_yesterday
        )));
        blocks.push(bullet_block(&format!(
            "Tabs Closed: {} (yesterday: {})",
            trends.tabs_closed_today, trends.tabs_closed_yesterday
        )));
        if let Some(cat) = &trends.top_category_today {
            blocks.push(bullet_block(&format!("Top Category: {}", cat)));
        }
    }

    // Add category breakdown
    if !report.category_time.is_empty() {
        blocks.push(heading_block("Time by Category"));
        for cat in &report.category_time {
            blocks.push(bullet_block(&format!(
                "{}: {} ({} tabs)",
                cat.category,
                format_duration(cat.time_ms),
                cat.tab_count
            )));
        }
    }

    // Add action items
    if !report.action_items.is_empty() {
        blocks.push(heading_block("Action Items"));
        for item in &report.action_items {
            blocks.push(bullet_block(&format!("[{}] {}", item.priority, item.action)));
        }
    }

    // Create page request
    let request = CreatePageRequest {
        parent: NotionParent {
            database_id: database_id.clone(),
        },
        properties: NotionPageProperties {
            name: NotionTitle {
                title: rich_text(&format!("Tabula Report - {}", report.date)),
            },
            date: NotionDate {
                date: NotionDateValue {
                    start: report.date.clone(),
                },
            },
        },
        children: blocks,
    };

    // Send request
    let response = client
        .post(format!("{}/pages", NOTION_API_BASE))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Notion-Version", NOTION_API_VERSION)
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if response.status().is_success() {
        let page_response: NotionPageResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        Ok(page_response.url)
    } else {
        let error: NotionError = response
            .json()
            .await
            .unwrap_or(NotionError {
                message: "Unknown error".to_string(),
            });
        Err(format!("Notion API error: {}", error.message))
    }
}

fn format_duration(ms: i64) -> String {
    let hours = ms / (60 * 60 * 1000);
    let minutes = (ms % (60 * 60 * 1000)) / (60 * 1000);

    if hours > 0 {
        format!("{}h {}m", hours, minutes)
    } else {
        format!("{}m", minutes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_to_blocks() {
        let content = "# Title\n\nSome text.\n\n- Item 1\n- Item 2";
        let blocks = content_to_blocks(content);

        assert_eq!(blocks.len(), 4);
        assert_eq!(blocks[0].block_type, "heading_2");
        assert_eq!(blocks[1].block_type, "paragraph");
        assert_eq!(blocks[2].block_type, "bulleted_list_item");
        assert_eq!(blocks[3].block_type, "bulleted_list_item");
    }

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(0), "0m");
        assert_eq!(format_duration(60000), "1m");
        assert_eq!(format_duration(3600000), "1h 0m");
        assert_eq!(format_duration(5400000), "1h 30m");
    }
}
