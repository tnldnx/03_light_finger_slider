
let handPose, video, slider;
let hands = [];
let sliderValue = 50;
let connections;

// Arduino 통신 변수
let port;
let writer;
let connectBtn;
let lastPwmVal = -1;
let sending = false;

async function setup() {
  createCanvas(640, 480);

  // Arduino 연결 버튼
  connectBtn = createButton('아두이노 연결');
  connectBtn.position(10, 490);
  connectBtn.mousePressed(connectSerial);

  // 슬라이더 생성
  slider = createSlider(0, 100, 50, 1);
  slider.style('writing-mode', 'vertical-rl');
  slider.style('height', '440px');
  slider.style('width', '20px');
  slider.style('transform', 'rotate(180deg)');
  slider.position(10, 20);
  slider.input(updateSliderValue);

  // 웹캠 설정
  video = createCapture(VIDEO, {flipped:true});
  video.size(640, 480);
  video.hide();

  // HandPose 설정
  handPose = await ml5.handPose({flipped:true});
  handPose.detectStart(video, gotHands);
  connections = handPose.getConnections();
}

function draw() {
  image(video, 0, 0, width, height);

  drawSkeletons(hands);
  drawKeyPoints(hands);

  // 중지를 접으면 슬라이더 조절
  let adjustMode = isGrabMode(hands);

  if (adjustMode) {
    drawConnectedLine(hands);

    let c = slider.value();
    let v = getNormalizedDistance(hands);

    let nextVal = c + 0.05 * (v - c);
    slider.value(nextVal);
    sliderValue = Number(slider.value());
  }

  // 슬라이더 값을 Arduino로 전송
  sendPwmToArduino(sliderValue);

  // 현재 PWM 값 표시
  let pwm = floor(map(sliderValue, 0, 100, 0, 255));

  noStroke();
  fill(0);
  rect(45, 420, 150, 40);

  fill(255);
  textSize(16);
  text('PWM: ' + pwm, 55, 445);
}

// Arduino 연결
async function connectSerial() {
  if (writer) return;

  try {
    port = await navigator.serial.requestPort();
    await port.open({baudRate: 9600});

    let textEncoder = new TextEncoderStream();
    textEncoder.readable.pipeTo(port.writable);

    writer = textEncoder.writable.getWriter();

    connectBtn.html('연결됨');
    lastPwmVal = -1;

    console.log('Arduino 연결 완료');
  } catch (e) {
    console.log('연결 실패:', e);
  }
}

// Arduino에 PWM 값 전송
async function sendPwmToArduino(val) {
  if (!writer || sending) return;

  let pwmVal = floor(map(val, 0, 100, 0, 255));
  pwmVal = constrain(pwmVal, 0, 255);

  // 값이 달라졌을 때만 전송
  if (pwmVal !== lastPwmVal) {
    sending = true;

    try {
      await writer.write('PWM:' + pwmVal + '\n');
      lastPwmVal = pwmVal;

      console.log('PWM 전송:', pwmVal);
    } catch (e) {
      console.log('전송 실패:', e);
    }

    sending = false;
  }
}

// 손 인식 결과
function gotHands(results) {
  hands = results;
}

// 손가락 특징점 표시
function drawKeyPoints(hs) {
  for (let i = 0; i < hs.length; i++) {
    let hand = hs[i];

    for (let j = 0; j < hand.keypoints.length; j++) {
      let keypoint = hand.keypoints[j];

      fill(255, 0, 0);
      noStroke();
      circle(keypoint.x, keypoint.y, 10);
    }
  }
}

// 손가락 뼈대 표시
function drawSkeletons(hs) {
  if (!connections) return;

  for (let i = 0; i < hs.length; i++) {
    let hand = hs[i];

    stroke(0, 255, 0);
    strokeWeight(2);

    for (const [a, b] of connections) {
      const start = hand.keypoints[a];
      const end = hand.keypoints[b];

      if (start && end) {
        line(start.x, start.y, end.x, end.y);
      }
    }
  }
}

// 중지를 접었는지 확인
function isGrabMode(hs) {
  if (hs == null || hs.length == 0) return false;

  let ks = hs[0].keypoints;
  if (ks.length != 21) return false;

  let palmLength = dist(
    ks[0].x, ks[0].y,
    ks[9].x, ks[9].y
  );

  let grabDistance = dist(
    ks[0].x, ks[0].y,
    ks[12].x, ks[12].y
  );

  if (grabDistance > palmLength) return false;

  return true;
}

// 엄지와 검지 사이 연결선
function drawConnectedLine(hs) {
  if (hs.length > 0) {
    let hand = hs[0];

    const a = hand.keypoints[4];
    const b = hand.keypoints[8];

    stroke(255, 140, 0);
    strokeWeight(4);

    line(a.x, a.y, b.x, b.y);

    noFill();
    circle(a.x, a.y, 22);
    circle(b.x, b.y, 22);
  }
}

// 엄지와 검지 사이 거리 계산
function getNormalizedDistance(hs) {
  if (hs.length > 0) {
    let ks = hs[0].keypoints;

    const a = ks[4]; // 엄지 끝
    const b = ks[8]; // 검지 끝
    const c = ks[0]; // 손목
    const d = ks[9]; // 중지 시작점

    let v = dist(a.x, a.y, b.x, b.y);
    let p = dist(c.x, c.y, d.x, d.y);

    if (p == 0) return 0;

    let s = round(100 * (v / p)) - 15;

    return constrain(s, 0, 100);
  }

  return 0;
}

// 마우스로 슬라이더를 조절할 때
function updateSliderValue() {
  sliderValue = Number(slider.value());
}
