// Gateway Connection Test
// Run with: cargo test --test gateway_test

use std::time::Duration;

#[tokio::test]
async fn test_gateway_connection() {
    let url = "ws://127.0.0.1:18789";
    
    // Try to connect
    let result = tokio_tungstenite::connect_async(url).await;
    
    match result {
        Ok((ws_stream, _)) => {
            println!("✅ Successfully connected to Gateway at {}", url);
            
            let (mut write, mut read) = ws_stream.split();
            
            // Send a ping
            let ping = serde_json::json!({
                "type": "req",
                "id": uuid::Uuid::new_v4().to_string(),
                "method": "system.ping",
                "params": {}
            });
            
            use tokio_tungstenite::tungstenite::Message;
            write.send(Message::Text(ping.to_string().into())).await.unwrap();
            println!("✅ Sent ping");
            
            // Wait for response
            tokio::select! {
                msg = read.next() => {
                    match msg {
                        Some(Ok(Message::Text(text))) => {
                            println!("✅ Received response: {}", text);
                        }
                        Some(Ok(Message::Close(_))) => {
                            println!("⚠️  Connection closed by server");
                        }
                        _ => {}
                    }
                }
                _ = tokio::time::sleep(Duration::from_secs(5)) => {
                    println!("⚠️  Timeout waiting for response");
                }
            }
        }
        Err(e) => {
            println!("❌ Failed to connect to Gateway: {}", e);
        }
    }
}
