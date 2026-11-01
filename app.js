import { auth, authReady, rtdb } from "./firebase.js";

import {
  ref,
  onValue,
  push,
  set,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
import {
  getMessaging,
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js";
import {
  signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

async function testRTDBWrite() {
  try {
    const testRef = push(ref(rtdb, "debug_test"));

    await set(testRef, {
      message: "CLASSGUARD RTDB test",
      timestamp: Date.now()
    });

    console.log("RTDB WRITE SUCCESS:", testRef.key);
    alert("RTDB write successful!");
  } catch (error) {
    console.error("RTDB WRITE FAILED:", error.code, error.message);
    alert(`RTDB write failed: ${error.code || error.message}`);
  }
}

// =====================================
// CLASSGUARD AI - PAGE NAVIGATION
// =====================================

const pageInfo = {
  overview: [
    "Overview",
    "Classroom overview",
    "A clear view of your classroom environment and system health."
  ],
  environment: [
    "Environment",
    "Environmental monitoring",
    "Track classroom temperature, humidity and air-quality sensor readings."
  ],
  announcements: [
    "Announcements",
    "Announcement control",
    "Prepare messages for playback through the classroom speaker."
  ],
  security: [
    "Camera & security",
    "Camera and security",
    "Camera snapshots and after-hours monitoring will be integrated later."
  ]
};

const title = document.getElementById("pageTitle");
const subtitle = document.getElementById("pageSubtitle");
const breadcrumb = document.getElementById("breadcrumbTitle");
const toast = document.getElementById("toast");
const enableNotificationsButton =
  document.getElementById("enableNotificationsButton");
const logoutButton =
  document.getElementById("logoutButton");

const FCM_VAPID_KEY =
  "BGkaMlaRbiuTvFumI9ZTxtFNC6Hh7VTPLd9O1O96peCp8grHoAuFYFJv_X2jaj1XQXYwq7oG1_0tAWSeu62LbZ8";

let toastTimer;

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      await signOut(auth);
      window.location.replace("index.html");
    } catch (error) {
      console.error("Logout failed:", error);
      showToast("Could not sign out. Please try again.");
      logoutButton.disabled = false;
    }
  });
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}


async function registerForNotifications() {
  if (
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    throw new Error(
      "This browser does not support web notifications."
    );
  }

  // Check notification permission
  let permission = Notification.permission;

  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission === "denied") {
    throw new Error(
      "Notifications are blocked. Allow them in Chrome Site Settings."
    );
  }

  if (permission !== "granted") {
    throw new Error(
      "Notification permission was not granted."
    );
  }

  // Register service worker
  const registration = await navigator.serviceWorker.register(
    "./firebase-messaging-sw.js"
  );

  await navigator.serviceWorker.ready;

  // Generate FCM token
  const messaging = getMessaging();

  const token = await getToken(messaging, {
    vapidKey: FCM_VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (!token) {
    throw new Error(
      "Firebase did not return an FCM registration token."
    );
  }

  // Save ONE token, replacing the previous token
  const tokenRecord = ref(
    rtdb,
    "fcm_tokens/classguard_s3_01"
  );

  await set(tokenRecord, {
    token: token,
    platform: "web",
    user_agent: navigator.userAgent,
    updated_at: serverTimestamp()
  });

  console.log("FCM token saved successfully.");

  return token;
}


if (enableNotificationsButton) {
  enableNotificationsButton.addEventListener("click", async () => {
    enableNotificationsButton.disabled = true;
    enableNotificationsButton.textContent = "Enabling...";

    try {
      await registerForNotifications();
      showToast("Notifications enabled.");
      enableNotificationsButton.textContent = "Notifications enabled";
    } catch (error) {
      console.error("FCM registration failed:", error);
      showToast(error.message || "Could not enable notifications.");
      enableNotificationsButton.disabled = false;
      enableNotificationsButton.textContent = "Enable notifications";
    }
  });
}

try {
  const messaging = getMessaging();

  onMessage(messaging, payload => {
    const title = payload.notification?.title || "CLASSGUARD AI";
    const body = payload.notification?.body || "New classroom alert.";
    showToast(`${title}: ${body}`);
  });
} catch (error) {
  console.error("FCM foreground listener could not start:", error);
}

function showPage(page) {
  const info = pageInfo[page];

  if (!info) return;

  if (breadcrumb) breadcrumb.textContent = info[0];
  if (title) title.textContent = info[1];
  if (subtitle) subtitle.textContent = info[2];

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  const overviewPage = document.getElementById("overviewPage");
  const environmentPage = document.getElementById("environmentPage");
  const announcementsPage =
    document.getElementById("announcementsPage");

  if (overviewPage) {
    overviewPage.hidden = page !== "overview";
  }

  if (environmentPage) {
    environmentPage.hidden = page !== "environment";
  }

  if (page === "environment") {
    renderSensorCharts();
  }

  if (announcementsPage) {
    announcementsPage.hidden = page !== "announcements";
  }

  const sidebar = document.getElementById("sidebar");

  if (sidebar) {
    sidebar.classList.remove("open");
  }

  if (
    page !== "overview" &&
    page !== "environment" &&
    page !== "announcements"
  ) {
    showToast(`${info[1]} interface is being prepared.`);
  }
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.goto);
  });
});

const menuToggle = document.getElementById("menuToggle");

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

// =====================================
// CURRENT DATE
// =====================================

const date = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata"
});

const currentDate = document.getElementById("currentDate");

if (currentDate) {
  currentDate.textContent = date.format(new Date());
}

// =====================================
// CLASSGUARD AI - RTDB SENSOR DATA
// =====================================

// RTDB path:
// /sensor_readings/classguard_s3_01

const temperatureValue =
  document.getElementById("temperatureValue");

const humidityValue =
  document.getElementById("humidityValue");

const airQualityValue =
  document.getElementById("airQualityValue");

const temperatureState =
  document.getElementById("temperatureState");

const humidityState =
  document.getElementById("humidityState");

const airQualityState =
  document.getElementById("airQualityState");

const controllerState =
  document.getElementById("controllerState");

const lastCommunication =
  document.getElementById("lastCommunication");

const controllerSystemStatus =
  document.getElementById("controllerSystemStatus");

const firebaseSystemStatus =
  document.getElementById("firebaseSystemStatus");

const liveDataLabel =
  document.getElementById("liveDataLabel");

const environmentLiveLabel =
  document.getElementById("environmentLiveLabel");

const temperatureChart =
  document.getElementById("temperatureChart");

const humidityChart =
  document.getElementById("humidityChart");

const airQualityChart =
  document.getElementById("airQualityChart");

const temperatureChartValue =
  document.getElementById("temperatureChartValue");

const humidityChartValue =
  document.getElementById("humidityChartValue");

const airQualityChartValue =
  document.getElementById("airQualityChartValue");

const sensorHistory = {
  temperature: [],
  humidity: [],
  airQuality: []
};

const chartColors = {
  temperature: "#f08a55",
  humidity: "#3978ed",
  airQuality: "#21b6c7"
};

function isValidSensorValue(value) {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
}

function drawSensorChart(canvas, values, color, unit) {
  if (!canvas) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (!width || !height) return;

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const context = canvas.getContext("2d");
  if (!context) return;

  context.scale(pixelRatio, pixelRatio);
  context.clearRect(0, 0, width, height);

  const padding = { top: 16, right: 12, bottom: 20, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  context.strokeStyle = "#e9eef6";
  context.lineWidth = 1;

  for (let index = 0; index < 3; index += 1) {
    const y = padding.top + (chartHeight / 2) * index;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }

  if (!values.length) {
    context.fillStyle = "#94a3b8";
    context.font = "12px DM Sans, sans-serif";
    context.textAlign = "center";
    context.fillText(
      "Waiting for sensor data",
      width / 2,
      height / 2 + 4
    );
    return;
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const points = values.map((value, index) => ({
    x:
      values.length === 1
        ? width / 2
        : padding.left +
          (chartWidth * index) / (values.length - 1),
    y:
      padding.top +
      chartHeight -
      ((value - minimum) / range) * chartHeight
  }));

  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.lineTo(points[points.length - 1].x, height - padding.bottom);
  context.lineTo(points[0].x, height - padding.bottom);
  context.closePath();
  context.fillStyle = `${color}18`;
  context.fill();

  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.strokeStyle = color;
  context.lineWidth = 2.5;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke();

  const lastPoint = points[points.length - 1];
  context.beginPath();
  context.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = "#fff";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#7e8ba1";
  context.font = "11px DM Sans, sans-serif";
  context.textAlign = "right";
  context.fillText(`${minimum.toFixed(1)} ${unit}`, width - padding.right, height - 4);
  context.fillText(`${maximum.toFixed(1)} ${unit}`, width - padding.right, padding.top - 4);
}

function updateSensorCharts(data) {
  const sensors = [
    {
      value: data.temperature,
      history: sensorHistory.temperature,
      canvas: temperatureChart,
      color: chartColors.temperature,
      unit: "°C",
      currentValue: temperatureChartValue
    },
    {
      value: data.humidity,
      history: sensorHistory.humidity,
      canvas: humidityChart,
      color: chartColors.humidity,
      unit: "%",
      currentValue: humidityChartValue
    },
    {
      value: data.airQualityRaw,
      history: sensorHistory.airQuality,
      canvas: airQualityChart,
      color: chartColors.airQuality,
      unit: "raw",
      currentValue: airQualityChartValue
    }
  ];

  sensors.forEach(sensor => {
    if (isValidSensorValue(sensor.value)) {
      sensor.history.push(Number(sensor.value));

      if (sensor.history.length > 24) {
        sensor.history.shift();
      }

      if (sensor.currentValue) {
        sensor.currentValue.textContent =
          `${Number(sensor.value).toFixed(1)} ${sensor.unit}`;
      }
    }

  });

  renderSensorCharts();

  if (environmentLiveLabel) {
    environmentLiveLabel.innerHTML = "<span></span> LIVE DATA";
  }
}

function renderSensorCharts() {
  drawSensorChart(
    temperatureChart,
    sensorHistory.temperature,
    chartColors.temperature,
    "°C"
  );
  drawSensorChart(
    humidityChart,
    sensorHistory.humidity,
    chartColors.humidity,
    "%"
  );
  drawSensorChart(
    airQualityChart,
    sensorHistory.airQuality,
    chartColors.airQuality,
    "raw"
  );
}

window.addEventListener("resize", () => {
  renderSensorCharts();
});

// =====================================
// DISPLAY SENSOR VALUES
// =====================================

function updateMetric(element, value, unit) {
  if (!element) return;

  if (
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isFinite(Number(value))
  ) {
    element.innerHTML = `-- <small>${unit}</small>`;
    return;
  }

  element.innerHTML =
    `${Number(value).toFixed(1)} <small>${unit}</small>`;
}

function updateSensorState(element, value, warning, danger) {
  if (!element) return;

  element.className = "metric-state neutral";

  if (!Number.isFinite(value)) {
    element.textContent = "Unavailable";
  } else if (value >= danger) {
    element.textContent = "High";
  } else if (value >= warning) {
    element.textContent = "Elevated";
  } else {
    element.textContent = "Normal";
  }
}

// =====================================
// FORMAT LAST UPDATE TIME
// =====================================

function formatLastSeen(timestamp) {
  if (timestamp === undefined || timestamp === null) {
    return "Timestamp unavailable";
  }

  // RTDB timestamp should be Unix time in milliseconds.
  const milliseconds = Number(timestamp);

  if (
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  ) {
    return "Timestamp unavailable";
  }

  return new Date(milliseconds).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "short"
  });
}

// =====================================
// HANDLE MISSING SENSOR DATA
// =====================================

function showNoSensorData() {
  updateMetric(temperatureValue, null, "°C");
  updateMetric(humidityValue, null, "%");
  updateMetric(airQualityValue, null, "raw");

  [
    temperatureState,
    humidityState,
    airQualityState
  ].forEach(element => {
    if (element) {
      element.textContent = "Unavailable";
      element.className = "metric-state neutral";
    }
  });

  if (liveDataLabel) {
    liveDataLabel.textContent = "NO SENSOR DATA";
  }

  if (lastCommunication) {
    lastCommunication.textContent = "No reading received";
  }

  if (controllerState) {
    controllerState.textContent = "Waiting for device";
  }

  if (controllerSystemStatus) {
    controllerSystemStatus.textContent = "Waiting";
  }
}

// =====================================
// DISPLAY LATEST SENSOR READING
// =====================================

function renderSensorReading(data) {
  if (!data || typeof data !== "object") {
    showNoSensorData();
    return;
  }

  console.log("RTDB sensor data:", data);

  updateSensorCharts(data);

  updateMetric(
    temperatureValue,
    data.temperature,
    "°C"
  );

  updateMetric(
    humidityValue,
    data.humidity,
    "%"
  );

  updateMetric(
    airQualityValue,
    data.airQualityRaw,
    "raw"
  );

  // Temperature status
  const temperature = Number(data.temperature);

  if (data.temperatureValid === false) {
    if (temperatureState) {
      temperatureState.textContent = "Invalid reading";
      temperatureState.className = "metric-state neutral";
    }
  } else if (
    data.temperature !== null &&
    data.temperature !== undefined &&
    data.temperature !== "" &&
    Number.isFinite(temperature)
  ) {
    updateSensorState(
      temperatureState,
      temperature,
      35,
      38
    );
  } else if (temperatureState) {
    temperatureState.textContent = "Unavailable";
    temperatureState.className = "metric-state neutral";
  }

  // Humidity status
  const humidityValid =
    data.humidity !== undefined &&
    data.humidity !== null &&
    data.humidity !== "" &&
    Number.isFinite(Number(data.humidity));

  if (humidityState) {
    humidityState.textContent =
      humidityValid ? "Available" : "Unavailable";

    humidityState.className = "metric-state neutral";
  }

  // MQ135 raw sensor reading.
  // These thresholds are raw-value indicators, not calibrated AQI.
  const airQuality = Number(data.airQualityRaw);

  if (
    data.airQualityRaw !== undefined &&
    data.airQualityRaw !== null &&
    data.airQualityRaw !== "" &&
    Number.isFinite(airQuality)
  ) {
    updateSensorState(
      airQualityState,
      airQuality,
      1000,
      1500
    );
  } else if (airQualityState) {
    airQualityState.textContent = "Unavailable";
    airQualityState.className = "metric-state neutral";
  }

  // Last communication
  if (lastCommunication) {
    lastCommunication.textContent =
      formatLastSeen(data.timestamp);
  }

  if (controllerState) {
    controllerState.textContent = "Receiving data";
  }

  if (controllerSystemStatus) {
    controllerSystemStatus.textContent = "Online";
  }

  if (firebaseSystemStatus) {
    firebaseSystemStatus.textContent = "Connected";
  }

  if (liveDataLabel) {
    liveDataLabel.textContent = "LIVE DATA";
  }
}

// =====================================
// REALTIME DATABASE LIVE LISTENER
// =====================================

const sensorPath = "sensor_readings/classguard_s3_01";

function showSensorConnectionError(error) {
  const errorCode = error?.code || "unknown-error";
  const errorMessage =
    error?.message || "The sensor data could not be read.";

  console.error(
    `Realtime Database sensor error at /${sensorPath}:`,
    errorCode,
    errorMessage,
    error
  );

  if (liveDataLabel) {
    liveDataLabel.textContent = "CONNECTION ERROR";
  }

  if (firebaseSystemStatus) {
    firebaseSystemStatus.textContent = errorCode;
    firebaseSystemStatus.title = errorMessage;
  }

  if (controllerSystemStatus) {
    controllerSystemStatus.textContent = "Offline";
  }
}

async function startSensorListener() {
  try {
    await authReady;

    if (!auth.currentUser) {
      throw new Error(
        "No authenticated user is available for RTDB sensor access."
      );
    }

    console.log(
      "Starting RTDB sensor listener:",
      `/${sensorPath}`,
      "authenticated:",
      Boolean(auth.currentUser)
    );

    onValue(
      ref(rtdb, sensorPath),
      snapshot => {
        const data = snapshot.val();

        console.log("RTDB sensor snapshot received:", data);
        renderSensorReading(data);

        if (firebaseSystemStatus) {
          firebaseSystemStatus.textContent = "Connected";
          firebaseSystemStatus.title = `/${sensorPath}`;
        }
      },
      showSensorConnectionError
    );
  } catch (error) {
    showSensorConnectionError(error);

    if (!auth.currentUser) {
      window.setTimeout(() => {
        window.location.replace("index.html");
      }, 1200);
    }
  }
}

startSensorListener();

// =====================================
// ANNOUNCEMENT SYSTEM - RTDB
// =====================================

const announcementMessage =
  document.getElementById("announcementMessage");

const announcementCharCount =
  document.getElementById("announcementCharCount");

const announcementPriority =
  document.getElementById("announcementPriority");

const announcementPreviewText =
  document.getElementById("announcementPreviewText");

const announcementPreviewPriority =
  document.getElementById("announcementPreviewPriority");

const previewAnnouncementButton =
  document.getElementById("previewAnnouncementButton");

const sendAnnouncementButton =
  document.getElementById("sendAnnouncementButton");

// =====================================
// ANNOUNCEMENT CHARACTER COUNTER
// =====================================

function updateAnnouncementCount() {
  if (!announcementMessage || !announcementCharCount) {
    return;
  }

  announcementCharCount.textContent =
    `${announcementMessage.value.length} / 250`;
}

// =====================================
// ANNOUNCEMENT PREVIEW
// =====================================

function updateAnnouncementPreview() {
  if (
    !announcementMessage ||
    !announcementPriority ||
    !announcementPreviewText ||
    !announcementPreviewPriority
  ) {
    return;
  }

  const message = announcementMessage.value.trim();

  announcementPreviewText.textContent =
    message || "Your announcement will appear here.";

  announcementPreviewPriority.textContent =
    announcementPriority.value.toUpperCase() + " PRIORITY";
}

// =====================================
// QUICK MESSAGE BUTTONS
// =====================================

document.querySelectorAll(".preset-button").forEach(button => {
  button.addEventListener("click", () => {
    if (!announcementMessage) return;

    announcementMessage.value = button.dataset.preset;

    updateAnnouncementCount();
    updateAnnouncementPreview();
  });
});

// =====================================
// ANNOUNCEMENT INPUT EVENTS
// =====================================

if (announcementMessage) {
  announcementMessage.addEventListener("input", () => {
    updateAnnouncementCount();
    updateAnnouncementPreview();
  });
}

if (announcementPriority) {
  announcementPriority.addEventListener(
    "change",
    updateAnnouncementPreview
  );
}

// =====================================
// PREVIEW BUTTON
// =====================================

if (previewAnnouncementButton) {
  previewAnnouncementButton.addEventListener("click", () => {
    updateAnnouncementPreview();
    showToast("Preview updated.");
  });
}

// =====================================
// SEND ANNOUNCEMENT TO RTDB
// =====================================

// WARNING:
// This stores announcements in RTDB /commands.
// Your Node.js server and ESP32 must also be
// migrated to read commands from RTDB.

if (sendAnnouncementButton) {
  sendAnnouncementButton.addEventListener(
    "click",
    async () => {
      const message = announcementMessage
        ? announcementMessage.value.trim()
        : "";

      if (!message) {
        showToast("Please enter an announcement.");

        if (announcementMessage) {
          announcementMessage.focus();
        }

        return;
      }

      sendAnnouncementButton.disabled = true;
      sendAnnouncementButton.textContent = "Sending...";

      try {
        const announcementData = {
          command_type: "announcement",
          message: message,
          priority: announcementPriority.value,
          target_device: "classguard_s3_01",
          status: "pending",
          timestamp: serverTimestamp()
        };

        const commandReference = push(
          ref(rtdb, "commands")
        );

        await set(commandReference, announcementData);

        console.log(
          "Announcement uploaded to RTDB:",
          commandReference.key
        );

        showToast("Announcement uploaded successfully!");

        announcementMessage.value = "";

        updateAnnouncementCount();
        updateAnnouncementPreview();

      } catch (error) {
        const errorCode = error?.code || "unknown-error";
        const errorMessage =
          error?.message || "The database rejected the request.";

        console.error(
          "Realtime Database announcement error:",
          errorCode,
          errorMessage,
          error
        );

        showToast(`Upload failed: ${errorCode}`);
        alert(`Announcement upload failed.\n\n${errorCode}: ${errorMessage}`);

      } finally {
        sendAnnouncementButton.disabled = false;
        sendAnnouncementButton.textContent =
          "Send announcement →";
      }
    }
  );
}

// =====================================
// INITIAL ANNOUNCEMENT SETUP
// =====================================

updateAnnouncementCount();
updateAnnouncementPreview();

// =====================================
// SLOW ENGLISH VOICE PREVIEW
// =====================================

const voicePreviewButton =
  document.getElementById("previewAnnouncementButton");

const announcementInput =
  document.getElementById("announcementMessage");

const testButton = document.getElementById("testRTDBButton");

if (testButton) {
  testButton.addEventListener("click", testRTDBWrite);
}

if (voicePreviewButton && announcementInput) {
  voicePreviewButton.addEventListener("click", () => {
    const message = announcementInput.value.trim();

    if (!message) {
      alert("Please enter an announcement first.");
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert("Text-to-Speech is not supported.");
      return;
    }

    window.speechSynthesis.cancel();

    const fullMessage = "Attention please. " + message;

    const speech = new SpeechSynthesisUtterance(fullMessage);

    speech.lang = "en-US";
    speech.rate = 0.72;
    speech.pitch = 0.90;
    speech.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const preferredVoice =
      voices.find(
        voice =>
          voice.name.includes("Google") &&
          voice.lang.startsWith("en")
      ) ||
      voices.find(voice => voice.lang === "en-US") ||
      voices.find(voice => voice.lang.startsWith("en"));

    if (preferredVoice) {
      speech.voice = preferredVoice;
    }

    window.speechSynthesis.speak(speech);
  });
}
