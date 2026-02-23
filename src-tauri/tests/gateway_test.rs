// Gateway Connection Test
// Run with: cargo test --test gateway_test -- --nocapture

#[tokio::test]
#[ignore = "Requires running Gateway - run manually with --ignored"]
async fn test_gateway_connection() {
    use futures_util::sink::SinkExt;
    use futures_util::stream::StreamExt;
    use std::time::Duration;
    use tokio_tungstenite::tungstenite::Message;

    let url = "ws://127.0.0.1:18789";

    // Try to connect
    let result = tokio_tungstenite::connect_async(url).await;

    match result {
        Ok((mut ws_stream, _)) => {
            println!("✅ Successfully connected to Gateway at {}", url);

            // Send a ping
            let ping = serde_json::json!({
                "type": "req",
                "id": uuid::Uuid::new_v4().to_string(),
                "method": "system.ping",
                "params": {}
            });

            ws_stream
                .send(Message::Text(ping.to_string().into()))
                .await
                .unwrap();
            println!("✅ Sent ping");

            // Wait for response
            match tokio::time::timeout(Duration::from_secs(5), ws_stream.next()).await {
                Ok(Some(Ok(Message::Text(text)))) => {
                    println!("✅ Received response: {}", text);
                }
                Ok(Some(Ok(Message::Close(_)))) => {
                    println!("⚠️  Connection closed by server");
                }
                Ok(_) => {
                    println!("⚠️  Received unexpected message");
                }
                Err(_) => {
                    println!("⚠️  Timeout waiting for response");
                }
            }
        }
        Err(e) => {
            println!("❌ Failed to connect to Gateway: {}", e);
        }
    }
}
