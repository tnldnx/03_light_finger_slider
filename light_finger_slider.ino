// 1. LED 및 통신 설정
const int LED_PIN = 5;
const int BAUD_RATE = 9600;

// 2. 시리얼 데이터 저장 변수
char serialData[20];
int dataIndex = 0;
int brightness = 0;

// 3. 초기 설정
void setup() {
  Serial.begin(BAUD_RATE);

  pinMode(LED_PIN, OUTPUT);
  analogWrite(LED_PIN, 0);
}

// 4. 메인 반복문
void loop() {
  while (Serial.available() > 0) {
    char received = Serial.read();

    // 줄바꿈을 만나면 명령 처리
    if (received == '\n' || received == '\r') {
      if (dataIndex > 0) {
        serialData[dataIndex] = '\0';

        controlLED(serialData);

        dataIndex = 0;
      }
    }
    else {
      // 버퍼에 문자 저장
      if (dataIndex < sizeof(serialData) - 1) {
        serialData[dataIndex] = received;
        dataIndex++;
      }
      else {
        dataIndex = 0;
      }
    }
  }
}

// 5. LED 밝기 제어 함수
void controlLED(char* data) {
  if (strncmp(data, "PWM:", 4) == 0) {
    brightness = atoi(data + 4);

    brightness = constrain(brightness, 0, 255);

    analogWrite(LED_PIN, brightness);
  }
}
