import time
import logging
import paho.mqtt.client as mqtt
import websocket
import threading

class MQTTClient:
    def __init__(self, client_id, username, password, broker_url="wss://wss.gradient.network:443/mqtt"):
        # Set up initial configurations
        self.client_id = "Y2V7oc2H5MOSSKyLsaxlHGbInoP2"
        self.username = "bull1@veer.vn"
        self.password = "Rtn@2024"
        self.broker_url = broker_url
        self.client = None
        self.reconnect_time = 60  # Initial reconnect time in seconds
        self.reconnect_time_floor = self.reconnect_time
        self.reconnect_time_ceiling = 300  # Max reconnect time (5 minutes)
        self.is_reconnecting = False
        self.manual_disconnect = False
        self.unsupported_reconnect = False
        self.reconnect_timeout = None
        self.task = None
        self.on_connect = None
        self.logger = logging.getLogger(__name__)

    def get_state(self):
        if self.client and self.client.is_connected():
            return "Good"
        return "Disconnected"

    def connect(self, task=None, on_connect=None):
        self.task = task
        self.on_connect = on_connect
        self.logger.info("Connecting to broker...")

        # MQTT client setup
        self.client = mqtt.Client(client_id=self.client_id)
        self.client.username_pw_set(self.username, self.password)

        # Set callbacks for different MQTT events
        self.client.on_connect = self.on_connect_callback
        self.client.on_disconnect = self.on_disconnect_callback
        self.client.on_subscribe = self.on_subscribe_callback
        self.client.on_message = self.on_message_callback
        self.client.on_log = self.on_log_callback

        # WebSocket connection to the MQTT broker
        websocket.enableTrace(True)
        ws_url = self.broker_url
        self.client.ws_set_options({
            'hostname': ws_url,
            'port': 443,
            'keepalive': 60,
            'clean_session': True,
            'ssl': True
        })
        print(self.broker_url)
        self.client.connect(self.broker_url, port=443, keepalive=60)
        self.client.loop_start()

    def on_connect_callback(self, client, userdata, flags, rc):
        self.logger.info(f"Connected to broker with result code {rc}")
        if rc == 0:  # Successful connection
            self.reconnect_time = self.reconnect_time_floor
            self.manual_disconnect = False
            if self.on_connect:
                self.on_connect()

    def on_disconnect_callback(self, client, userdata, rc):
        self.logger.info(f"Disconnected from broker with code {rc}")
        if rc != 0:
            self.handle_reconnect()

    def on_subscribe_callback(self, client, userdata, mid, granted_qos):
        self.logger.info(f"Subscribed to topic with QoS {granted_qos}")

    def on_message_callback(self, client, userdata, msg):
        if self.task:
            self.task(msg.topic, msg.payload.decode())

    def on_log_callback(self, client, userdata, level, buf):
        self.logger.debug(f"Log: {buf}")

    def handle_reconnect(self):
        if self.manual_disconnect or self.is_reconnecting or self.unsupported_reconnect:
            return
        self.is_reconnecting = True
        self.logger.info(f"Reconnecting in {self.reconnect_time}s...")
        time.sleep(self.reconnect_time)

        try:
            self.connect(self.task, self.on_connect)  # Retry connection
        except Exception as e:
            self.logger.error(f"Reconnect attempt failed: {e}")
        finally:
            self.is_reconnecting = False
        # Exponentially back off the reconnect time
        self.reconnect_time = min(2 * self.reconnect_time, self.reconnect_time_ceiling)

    def subscribe(self, topic):
        if self.client.is_connected():
            self.client.subscribe(topic)
            self.logger.info(f"Subscribed to {topic}")
        else:
            self.logger.error("Cannot subscribe. MQTT client is not connected.")

    def unsubscribe(self, topic):
        if self.client.is_connected():
            self.client.unsubscribe(topic)
            self.logger.info(f"Unsubscribed from {topic}")
        else:
            self.logger.error("Cannot unsubscribe. MQTT client is not connected.")

    def publish(self, topic, payload, qos=0):
        if self.client.is_connected():
            self.client.publish(topic, payload, qos)
            self.logger.info(f"Message published to {topic}")
        else:
            self.logger.error("Publish failed. MQTT client is not connected.")

    def publish_async(self, topic, payload, qos=0):
        if self.client.is_connected():
            self.client.publish(topic, payload, qos)
            self.logger.info(f"Message published asynchronously to {topic}")
        else:
            self.logger.error("Publish failed. MQTT client is not connected.")

    def disconnect(self, manual=False):
        self.manual_disconnect = manual
        if self.client:
            self.client.disconnect()
            self.logger.info("Disconnected from broker.")
            self.client.loop_stop()  # Stop the MQTT loop
            self.client = None

# Example usage:
def on_connect_callback():
    print("Connected to broker.")
    client.subscribe("test/topic")

def handle_message_callback(topic, message):
    print(f"Received message: {message} on topic {topic}")

# Create an MQTT client instance
client = MQTTClient(client_id="Y2V7oc2H5MOSSKyLsaxlHGbInoP2", username="bull1@veer.vn", password="Rtn@2024")

# Connect to the broker and start handling messages
client.connect(task=handle_message_callback, on_connect=on_connect_callback)

# Publish a message
client.publish("test/topic", "Hello, MQTT!")

# Wait and allow for message processing
time.sleep(10)

# Disconnect after the processing
client.disconnect()
