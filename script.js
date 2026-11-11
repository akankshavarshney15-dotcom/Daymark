
/* ==========================================
   DAYMARK - PERSONAL PRODUCTIVITY PLANNER
   ========================================== */

const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "daymark-tasks";
const THEME_KEY = "daymark-theme";

// ==========================================
// 1. STATE
// ==========================================

let tasks = [];
let activeFilter = "all";
let activeView = "dashboard";
let selectedDate = getLocalDateString(new Date());

let calendarDate = new Date();
calendarDate.setDate(1);

let editingTaskId = null;


// ==========================================
// 2. DATE HELPERS
// ==========================================

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseDate(value) {
    if (!value) return null;

    const [year, month, day] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
}

function formatDate(value) {
    if (!value) return "No due date";

    const date = parseDate(value);

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getToday() {
    return getLocalDateString(new Date());
}

function isSameDay(date1, date2) {
    return date1 === date2;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// ==========================================
// 3. LOCAL STORAGE
// ==========================================

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
    try {
        let saved = localStorage.getItem(STORAGE_KEY);

        // Migrate tasks from older TaskFlow version
        if (!saved) {
            saved = localStorage.getItem("taskflow-tasks");
        }

        if (!saved) {
            tasks = [];
            return;
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            tasks = [];
            return;
        }

        tasks = parsed.map(task => {
            const completed = Boolean(task.completed);

            return {
                id: task.id || Date.now() + Math.random(),
                title: task.title || task.name || "Untitled task",
                category: task.category || "Other",
                priority: task.priority || "medium",
                dueDate: task.dueDate || "",
                completed,
                createdAt: task.createdAt || new Date().toISOString(),
                completedAt: task.completedAt ||
                    (completed ? new Date().toISOString() : null)
            };
        });

        saveTasks();

    } catch (error) {
        console.error("Could not load saved tasks:", error);
        tasks = [];
    }
}


// ==========================================
// 4. HEADER AND GREETING
// ==========================================

function updateHeader() {
    const now = new Date();
    const hour = now.getHours();

    let greeting = "Good evening";

    if (hour < 12) {
        greeting = "Good morning";
    } else if (hour < 17) {
        greeting = "Good afternoon";
    }

    $("greeting").textContent = `${greeting}, Akanksha ✳`;

    $("current-date").textContent =
        now.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
}


// ==========================================
// 5. TASK CREATION
// ==========================================

$("task-form").addEventListener("submit", function(event) {
    event.preventDefault();

    const title = $("task-input").value.trim();

    if (!title) return;

    const task = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        title,
        category: $("task-category").value,
        priority: $("task-priority").value,
        dueDate: $("task-date").value,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null
    };

    tasks.unshift(task);

    saveTasks();
    this.reset();

    $("task-priority").value = "medium";

    renderAll();
});


// ==========================================
// 6. TASK COMPLETION
// ==========================================

function toggleTask(id) {
    const task = tasks.find(item => String(item.id) === String(id));

    if (!task) return;

    task.completed = !task.completed;

    task.completedAt = task.completed
        ? new Date().toISOString()
        : null;

    saveTasks();
    renderAll();
}


// ==========================================
// 7. TASK DELETE
// ==========================================

function deleteTask(id) {
    const confirmed = confirm("Delete this task?");

    if (!confirmed) return;

    tasks = tasks.filter(task => String(task.id) !== String(id));

    saveTasks();
    renderAll();
}


// ==========================================
// 8. EDIT TASK
// ==========================================

function openEditModal(id) {
    const task = tasks.find(item => String(item.id) === String(id));

    if (!task) return;

    editingTaskId = task.id;

    $("edit-task-id").value = task.id;
    $("edit-task-input").value = task.title;
    $("edit-category").value = task.category;
    $("edit-priority").value = task.priority;
    $("edit-date").value = task.dueDate || "";

    $("edit-modal").classList.add("show");
}

function closeEditModal() {
    $("edit-modal").classList.remove("show");
    editingTaskId = null;
}

$("close-modal").addEventListener("click", closeEditModal);

$("edit-modal").addEventListener("click", function(event) {
    if (event.target === this) closeEditModal();
});

$("edit-form").addEventListener("submit", function(event) {
    event.preventDefault();

    const task = tasks.find(
        item => String(item.id) === String(editingTaskId)
    );

    if (!task) return;

    const title = $("edit-task-input").value.trim();

    if (!title) return;

    task.title = title;
    task.category = $("edit-category").value;
    task.priority = $("edit-priority").value;
    task.dueDate = $("edit-date").value;

    saveTasks();
    closeEditModal();
    renderAll();
});


// ==========================================
// 9. TASK CARD TEMPLATE
// ==========================================

function createTaskHTML(task) {
    const today = getToday();

    let dueText = formatDate(task.dueDate);

    if (!task.completed && task.dueDate && task.dueDate < today) {
        dueText = "Overdue · " + dueText;
    }

    return `
        <article class="task-item ${task.completed ? "completed" : ""}">

            <input
                type="checkbox"
                class="task-check"
                data-action="toggle"
                data-id="${escapeHTML(task.id)}"
                ${task.completed ? "checked" : ""}
                aria-label="Mark ${escapeHTML(task.title)} as complete"
            >

            <div class="task-info">
                <h4>${escapeHTML(task.title)}</h4>
                <small>
                    ${escapeHTML(task.category)} ·
                    ${escapeHTML(dueText)}
                </small>
            </div>

            <div class="task-tags">
                <span class="tag ${escapeHTML(task.priority)}">
                    ${escapeHTML(task.priority)}
                </span>
            </div>

            <div class="task-actions">

                <button
                    data-action="edit"
                    data-id="${escapeHTML(task.id)}"
                    aria-label="Edit task">
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button
                    data-action="delete"
                    data-id="${escapeHTML(task.id)}"
                    aria-label="Delete task">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </div>

        </article>
    `;
}


// ==========================================
// 10. EVENT DELEGATION FOR TASK LISTS
// ==========================================

document.addEventListener("click", function(event) {

    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "edit") openEditModal(id);

    if (action === "delete") deleteTask(id);

});

document.addEventListener("change", function(event) {

    const checkbox = event.target.closest(
        'input[data-action="toggle"]'
    );

    if (!checkbox) return;

    toggleTask(checkbox.dataset.id);

});


// ==========================================
// 11. SEARCH AND FILTERS
// ==========================================

$("search-input").addEventListener("input", renderTaskList);

document.querySelectorAll(".filter-btn").forEach(button => {

    button.addEventListener("click", function() {

        activeFilter = this.dataset.filter;

        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.toggle("active", btn === this);
        });

        renderTaskList();
    });

});


function getFilteredTasks() {
    const search = $("search-input").value
        .trim()
        .toLowerCase();

    return tasks.filter(task => {

        const matchesSearch =
            task.title.toLowerCase().includes(search) ||
            task.category.toLowerCase().includes(search);

        const matchesFilter =
            activeFilter === "all" ||
            (activeFilter === "pending" && !task.completed) ||
            (activeFilter === "completed" && task.completed);

        return matchesSearch && matchesFilter;
    });
}


function renderTaskList() {
    const list = $("task-list");
    const filtered = getFilteredTasks();

    list.innerHTML = filtered.map(createTaskHTML).join("");

    $("empty-state").hidden = filtered.length > 0;

    $("list-count").textContent =
        `${filtered.length} ${filtered.length === 1 ? "task" : "tasks"}`;
}


// ==========================================
// 12. DASHBOARD STATISTICS
// ==========================================

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    $("total-count").textContent = total;
    $("pending-count").textContent = pending;
    $("completed-count").textContent = completed;

    const today = getToday();

    const todaysTasks = tasks.filter(task =>
        task.dueDate === today
    );

    const todaysCompleted = todaysTasks.filter(task =>
        task.completed
    ).length;

    const progress = todaysTasks.length
        ? Math.round((todaysCompleted / todaysTasks.length) * 100)
        : 0;

    $("progress-percent").textContent = `${progress}%`;
    $("progress-fill").style.width = `${progress}%`;
}


// ==========================================
// 13. MY DAY PLANNER
// ==========================================

function renderToday() {
    const today = getToday();

    const todaysTasks = tasks.filter(task =>
        task.dueDate === today
    );

    const overdueTasks = tasks.filter(task =>
        task.dueDate &&
        task.dueDate < today &&
        !task.completed
    );

    const upcomingTasks = tasks.filter(task =>
        task.dueDate &&
        task.dueDate > today &&
        !task.completed
    ).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    $("today-count").textContent = todaysTasks.length;
    $("overdue-count").textContent = overdueTasks.length;
    $("upcoming-count").textContent = upcomingTasks.length;

    $("today-list").innerHTML =
        todaysTasks.map(createTaskHTML).join("");

    $("overdue-list").innerHTML =
        overdueTasks.map(createTaskHTML).join("");

    $("upcoming-list").innerHTML =
        upcomingTasks.map(createTaskHTML).join("");

    $("today-empty").hidden = todaysTasks.length > 0;
    $("overdue-empty").hidden = overdueTasks.length > 0;
    $("upcoming-empty").hidden = upcomingTasks.length > 0;
}


// ==========================================
// 14. CALENDAR
// ==========================================

function renderCalendar() {

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();

    $("calendar-month").textContent =
        calendarDate.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric"
        });

    const today = getToday();
    let html = "";

    // Previous month's dates
    for (let i = firstDay - 1; i >= 0; i--) {

        const day = previousMonthDays - i;

        html += `
            <button class="calendar-day other-month" disabled>
                ${day}
            </button>
        `;
    }

    // Current month's dates
    for (let day = 1; day <= totalDays; day++) {

        const dateString = getLocalDateString(
            new Date(year, month, day)
        );

        const hasTasks = tasks.some(task =>
            task.dueDate === dateString
        );

        const isToday = dateString === today;
        const isSelected = dateString === selectedDate;

        html += `
            <button
                class="calendar-day
                ${isToday ? "today" : ""}
                ${isSelected ? "selected" : ""}"
                data-date="${dateString}"
                aria-label="${dateString}"
                aria-pressed="${isSelected}"
            >
                ${day}

                <span class="day-dots">
                    ${hasTasks ? "<span></span>" : ""}
                </span>
            </button>
        `;
    }

    // Next month's dates to complete grid
    const totalCells = firstDay + totalDays;
    const remaining = (7 - totalCells % 7) % 7;

    for (let day = 1; day <= remaining; day++) {
        html += `
            <button class="calendar-day other-month" disabled>
                ${day}
            </button>
        `;
    }

    $("calendar-grid").innerHTML = html;

    renderCalendarTasks();
}


function renderCalendarTasks() {

    const selectedTasks = tasks.filter(task =>
        task.dueDate === selectedDate
    );

    $("selected-date-title").textContent =
        parseDate(selectedDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    $("calendar-task-list").innerHTML =
        selectedTasks.map(createTaskHTML).join("");

    $("calendar-empty").hidden = selectedTasks.length > 0;
}


$("calendar-grid").addEventListener("click", function(event) {

    const dayButton = event.target.closest("[data-date]");

    if (!dayButton) return;

    selectedDate = dayButton.dataset.date;

    renderCalendar();
});


$("prev-month").addEventListener("click", function() {

    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();

});


$("next-month").addEventListener("click", function() {

    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();

});


// ==========================================
// 15. WEEKLY PROGRESS
// ==========================================

function renderWeeklyProgress() {

    const days = [];

    for (let i = 6; i >= 0; i--) {

        const date = new Date();

        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        const dateString = getLocalDateString(date);

        const completedCount = tasks.filter(task => {

            if (!task.completedAt) return false;

            const completedDate = getLocalDateString(
                new Date(task.completedAt)
            );

            return completedDate === dateString;

        }).length;

        days.push({
            label: date.toLocaleDateString("en-IN", {
                weekday: "short"
            }),
            count: completedCount
        });
    }

    const createdThisWeek = tasks.filter(task => {

        const created = new Date(task.createdAt);

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 6);

        return created >= start && created <= today;

    }).length;

    const completedThisWeek = days.reduce(
        (sum, day) => sum + day.count, 0
    );

    const rate = createdThisWeek
        ? Math.round(
            completedThisWeek / createdThisWeek * 100
        )
        : 0;

    $("week-created").textContent = createdThisWeek;
    $("week-completed").textContent = completedThisWeek;
    $("week-rate").textContent = `${rate}%`;

    const maxCount = Math.max(
        1,
        ...days.map(day => day.count)
    );

    $("weekly-chart").innerHTML = days.map(day => {

        const height = day.count
            ? Math.max(5, (day.count / maxCount) * 100)
            : 0;

        return `
            <div class="chart-column">

                <div class="chart-bar-wrap"
                title="${day.count} completed">

                    <div class="chart-bar"
                    style="height: ${height}%"></div>

                </div>

                <strong>${day.count}</strong>
                <span>${day.label}</span>

            </div>
        `;

    }).join("");
}


// ==========================================
// 16. FOCUS TIMER
// ==========================================

let timerInterval = null;
let timerDuration = 25 * 60;
let remainingSeconds = timerDuration;
let selectedMode = "Focus";
let completedSessions = Number(
    localStorage.getItem("daymark-sessions") || 0
);

const CIRCLE_LENGTH = 2 * Math.PI * 96;

$("session-count").textContent = completedSessions;


function updateTimerDisplay() {

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    $("timer-display").textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const progress =
        1 - remainingSeconds / timerDuration;

    $("timer-progress").style.strokeDashoffset =
        CIRCLE_LENGTH * progress;
}


function selectTimerMode(mode, minutes) {

    pauseTimer();

    selectedMode = mode;

    timerDuration = minutes * 60;
    remainingSeconds = timerDuration;

    $("timer-mode").textContent = mode.toUpperCase() + " SESSION";
    $("timer-status").textContent = "Ready when you are.";

    $("timer-start").innerHTML =
        '<i class="fa-solid fa-play"></i> Start';

    document.querySelectorAll(".mode-btn").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.mode === mode
        );

    });

    updateTimerDisplay();
}


function pauseTimer() {

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

}


function startTimer() {

    if (timerInterval) {
        pauseTimer();

        $("timer-start").innerHTML =
            '<i class="fa-solid fa-play"></i> Resume';

        $("timer-status").textContent = "Paused. Take your time.";
        return;
    }

    if (remainingSeconds <= 0) return;

    $("timer-status").textContent = "You're doing great!";
    $("timer-start").innerHTML =
        '<i class="fa-solid fa-pause"></i> Pause';

    timerInterval = setInterval(() => {

        remainingSeconds--;

        updateTimerDisplay();

        if (remainingSeconds <= 0) {

            pauseTimer();

            $("timer-start").innerHTML =
                '<i class="fa-solid fa-rotate-right"></i> Start again';

            $("timer-status").textContent = "Session complete! Well done.";

            if (selectedMode === "Focus") {
                completedSessions++;

                localStorage.setItem(
                    "daymark-sessions",
                    completedSessions
                );

                $("session-count").textContent =
                    completedSessions;
            }

            alert(`${selectedMode} session completed!`);

        }

    }, 1000);
}


function resetTimer() {

    pauseTimer();

    remainingSeconds = timerDuration;

    $("timer-start").innerHTML =
        '<i class="fa-solid fa-play"></i> Start';

    $("timer-status").textContent = "Ready when you are.";

    updateTimerDisplay();
}


document.querySelectorAll(".mode-btn").forEach(button => {

    button.addEventListener("click", function() {

        selectTimerMode(
            this.dataset.mode,
            Number(this.dataset.minutes)
        );

    });

});


$("timer-start").addEventListener("click", startTimer);
$("timer-reset").addEventListener("click", resetTimer);


// ==========================================
// 17. NAVIGATION
// ==========================================

function switchView(view) {

    const target = $(view + "-view");

    if (!target) return;

    activeView = view;

    document.querySelectorAll(".view").forEach(section => {
        section.classList.remove("active");
    });

    target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.view === view
        );

    });

    if (view === "today") renderToday();
    if (view === "calendar") renderCalendar();
    if (view === "week") renderWeeklyProgress();

    $("sidebar").classList.remove("open");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


document.querySelectorAll(".nav-item").forEach(button => {

    button.addEventListener("click", function() {

        switchView(this.dataset.view);

    });

});


// ==========================================
// 18. DARK MODE
// ==========================================

function applyTheme(theme) {

    document.body.classList.toggle(
        "dark",
        theme === "dark"
    );

    $("theme-toggle").innerHTML =
        theme === "dark"
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-regular fa-moon"></i>';

    localStorage.setItem(THEME_KEY, theme);
}


$("theme-toggle").addEventListener("click", function() {

    const isDark = document.body.classList.contains("dark");

    applyTheme(isDark ? "light" : "dark");

});


// ==========================================
// 19. MOBILE SIDEBAR
// ==========================================

$("menu-toggle").addEventListener("click", function() {

    $("sidebar").classList.toggle("open");

});


document.addEventListener("click", function(event) {

    const sidebar = $("sidebar");

    if (
        window.innerWidth <= 760 &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !$("menu-toggle").contains(event.target)
    ) {
        sidebar.classList.remove("open");
    }

});


// ==========================================
// 20. RENDER EVERYTHING
// ==========================================

function renderAll() {

    updateStats();
    renderTaskList();
    renderToday();
    renderCalendar();
    renderWeeklyProgress();

}


// ==========================================
// 21. INITIALIZATION
// ==========================================

function init() {

    loadTasks();

    const savedTheme =
        localStorage.getItem(THEME_KEY) || "light";

    applyTheme(savedTheme);

    updateHeader();
    updateTimerDisplay();

    renderAll();

    console.log("Daymark initialized successfully!");
}

init();
