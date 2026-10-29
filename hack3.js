
const $ = (id) => document.getElementById(id);

const taskForm = $("taskForm");
const taskInput = $("taskInput");
const taskCategory = $("taskCategory");
const taskList = $("taskList");
const emptyMessage = $("emptyMessage");

let tasks = [];
let currentFilter = "all";
let completedSessions = 0;

// Load saved data safely from the browser
try {
    const savedTasks = JSON.parse(
        localStorage.getItem("studySphereTasks") || "[]"
    );

    if (Array.isArray(savedTasks)) {
        tasks = savedTasks.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.text === "string" &&
            typeof task.category === "string" &&
            typeof task.done === "boolean"
        );
    }

    completedSessions = Math.max(
        0,
        Number(localStorage.getItem("studySphereSessions")) || 0
    );
} catch {
    tasks = [];
    completedSessions = 0;
}

function saveData() {
    try {
        localStorage.setItem("studySphereTasks", JSON.stringify(tasks));
        localStorage.setItem(
            "studySphereSessions",
            String(completedSessions)
        );
    } catch {
        alert("Browser storage is unavailable. Your changes may not be saved.");
    }
}

function renderTasks() {
    taskList.replaceChildren();

    const filteredTasks = tasks.filter(task => {
        if (currentFilter === "active") return !task.done;
        if (currentFilter === "completed") return task.done;
        return true;
    });

    filteredTasks.forEach(task => {
        const row = document.createElement("div");
        row.className = "task-item" + (task.done ? " done" : "");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-check";
        checkbox.checked = task.done;
        checkbox.setAttribute("aria-label", "Complete " + task.text);

        checkbox.addEventListener("change", () => {
            task.done = checkbox.checked;
            saveData();
            renderTasks();
        });

        const description = document.createElement("div");
        description.className = "task-description";

        const title = document.createElement("span");
        title.textContent = task.text;

        const category = document.createElement("small");
        category.textContent = task.category;

        description.append(title, category);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-task";
        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.setAttribute("aria-label", "Delete " + task.text);

        deleteButton.addEventListener("click", () => {
            tasks = tasks.filter(item => item.id !== task.id);
            saveData();
            renderTasks();
        });

        row.append(checkbox, description, deleteButton);
        taskList.appendChild(row);
    });

    emptyMessage.hidden = filteredTasks.length !== 0;
    updateStats();
}

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const text = taskInput.value.trim();
    if (!text) return;

    tasks.unshift({
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()) + Math.random(),
        text,
        category: taskCategory.value,
        done: false
    });

    taskInput.value = "";
    saveData();
    renderTasks();
    taskInput.focus();
});

document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.toggle("selected", btn === button);
        });

        renderTasks();
    });
});

function updateStats() {
    const completed = tasks.filter(task => task.done).length;
    const total = tasks.length;
    const rate = total ? Math.round(completed / total * 100) : 0;

    $("completedStat").textContent = completed;
    $("totalStat").textContent = total;
    $("sessionStat").textContent = completedSessions;
    $("rateStat").textContent = rate + "%";

    $("taskCount").textContent =
        total + (total === 1 ? " task" : " tasks");

    $("progressLabel").textContent = rate + "% completed";
    $("progressBar").style.width = rate + "%";
    $("progressDetail").textContent =
        `${completed} of ${total} tasks completed`;
}

// Dark mode with saved preference
const themeToggle = $("themeToggle");

try {
    if (localStorage.getItem("studySphereTheme") === "dark") {
        document.body.classList.add("dark");
    }
} catch {}

function updateThemeButton() {
    themeToggle.textContent =
        document.body.classList.contains("dark") ? "☾" : "☼";
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    try {
        localStorage.setItem(
            "studySphereTheme",
            document.body.classList.contains("dark") ? "dark" : "light"
        );
    } catch {}

    updateThemeButton();
});

updateThemeButton();

// Focus timer
const CIRCUMFERENCE = 2 * Math.PI * 94;
const timerProgress = $("timerProgress");

let selectedMinutes = 25;
let remainingSeconds = selectedMinutes * 60;
let timerInterval = null;
let timerEndTime = null;

function updateTimerDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    $("timerDisplay").textContent =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");

    const totalSeconds = selectedMinutes * 60;
    const progress = totalSeconds
        ? remainingSeconds / totalSeconds
        : 0;

    timerProgress.style.strokeDasharray = CIRCUMFERENCE;
    timerProgress.style.strokeDashoffset =
        CIRCUMFERENCE * (1 - progress);
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    timerEndTime = null;
    $("startTimer").textContent = "▶ Start Focus";
}

function tickTimer() {
    if (timerEndTime === null) return;

    remainingSeconds = Math.max(
        0,
        Math.ceil((timerEndTime - Date.now()) / 1000)
    );

    updateTimerDisplay();

    if (remainingSeconds === 0) {
        stopTimer();
        completedSessions++;
        saveData();
        updateStats();

        $("timerCaption").textContent = "Session completed! 🎉";
        $("timerMode").textContent = "WELL DONE";

        alert("Great work! Your focus session is complete.");
    }
}

function startTimer() {
    if (timerInterval !== null) {
        stopTimer();
        $("timerCaption").textContent = "Paused. Take a breath.";
        return;
    }

    if (remainingSeconds === 0) {
        remainingSeconds = selectedMinutes * 60;
    }

    timerEndTime = Date.now() + remainingSeconds * 1000;
    $("startTimer").textContent = "Ⅱ Pause";
    $("timerCaption").textContent = "Stay focused ✨";

    timerInterval = setInterval(tickTimer, 250);
    tickTimer();
}

$("startTimer").addEventListener("click", startTimer);

$("resetTimer").addEventListener("click", () => {
    stopTimer();
    remainingSeconds = selectedMinutes * 60;
    $("timerCaption").textContent = "Ready when you are";
    $("timerMode").textContent = "FOCUS TIME";
    updateTimerDisplay();
});

document.querySelectorAll(".preset-btn").forEach(button => {
    button.addEventListener("click", () => {
        stopTimer();

        document.querySelectorAll(".preset-btn").forEach(btn => {
            btn.classList.toggle("active", btn === button);
        });

        selectedMinutes = Number(button.dataset.minutes);
        remainingSeconds = selectedMinutes * 60;

        $("timerMode").textContent =
            selectedMinutes === 5 ? "SHORT BREAK" : "FOCUS TIME";

        $("timerCaption").textContent = "Ready when you are";
        updateTimerDisplay();
    });
});

renderTasks();
updateTimerDisplay();
