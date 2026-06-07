// Global States
let currentStep = 1;
const totalSteps = 3;
let analyticsLoaded = false;
let charts = {};

// Theme Settings
const themeColors = {
    dark: {
        text: '#a09eb5',
        grid: 'rgba(255, 255, 255, 0.05)',
        accent1: '#7f00ff', // Violet
        accent2: '#00f2fe', // Cyan
        cardBg: '#121026'
    },
    light: {
        text: '#5a6578',
        grid: 'rgba(0, 0, 0, 0.05)',
        accent1: '#6366f1', // Indigo
        accent2: '#0ea5e9', // Blue
        cardBg: '#ffffff'
    }
};

// Initial Execution on Load
document.addEventListener('DOMContentLoaded', () => {
    // Load stored theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const themeIcon = document.getElementById('theme-icon');
        themeIcon.className = 'fa-solid fa-sun';
    }
    
    // Set slider initial text
    const ageSlider = document.getElementById('child_age_months');
    updateSliderValue(ageSlider);
});

/* ==========================================================================
   TAB SYSTEM & THEME TOGGLE
   ========================================================================== */
function switchTab(tabId) {
    // Tabs Buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');

    // Sections
    document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`section-${tabId}`).classList.add('active');

    if (tabId === 'analytics' && !analyticsLoaded) {
        fetchAnalyticsData();
    }
}

function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        themeIcon.className = 'fa-solid fa-moon';
        localStorage.setItem('theme', 'dark');
        updateChartsTheme('dark');
    } else {
        body.classList.add('light-theme');
        themeIcon.className = 'fa-solid fa-sun';
        localStorage.setItem('theme', 'light');
        updateChartsTheme('light');
    }
}

/* ==========================================================================
   FORM WIZARD STEP NAVIGATION
   ========================================================================== */
function navigateStep(direction) {
    // Save current step
    const prevStep = currentStep;
    currentStep += direction;

    if (currentStep < 1) currentStep = 1;
    if (currentStep > totalSteps) currentStep = totalSteps;

    // Toggle Form Step Display
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    document.getElementById(`form-step-${currentStep}`).classList.add('active');

    // Update Stepper Progress indicators
    updateStepperVisuals(prevStep, currentStep);

    // Disable / Enable footer buttons
    document.getElementById('prev-btn').disabled = (currentStep === 1);
    
    if (currentStep === totalSteps) {
        document.getElementById('next-btn').classList.add('hidden');
        document.getElementById('submit-btn').classList.remove('hidden');
    } else {
        document.getElementById('next-btn').classList.remove('hidden');
        document.getElementById('submit-btn').classList.add('hidden');
    }
}

function updateStepperVisuals(prevStep, currStep) {
    // Steppers indicators
    for (let i = 1; i <= totalSteps; i++) {
        const stepInd = document.getElementById(`step-ind-${i}`);
        
        if (i < currStep) {
            stepInd.className = 'step-indicator complete';
            if (i < totalSteps) document.getElementById(`step-line-${i}`).className = 'step-line complete';
        } else if (i === currStep) {
            stepInd.className = 'step-indicator active';
            if (i < totalSteps) document.getElementById(`step-line-${i}`).className = 'step-line';
        } else {
            stepInd.className = 'step-indicator';
            if (i < totalSteps) document.getElementById(`step-line-${i}`).className = 'step-line';
        }
    }
}

/* ==========================================================================
   FORM CONTROLS INTERACTIONS
   ========================================================================== */
function updateSliderValue(slider) {
    const bubble = document.getElementById('child_age_bubble');
    bubble.textContent = `${slider.value} months`;
}

function adjustNumber(id, delta) {
    const input = document.getElementById(id);
    let val = parseInt(input.value) + delta;
    const min = parseInt(input.min);
    const max = parseInt(input.max);
    
    if (val < min) val = min;
    if (val > max) val = max;
    
    input.value = val;
}

function selectCardOption(hiddenInputId, value, cardElement) {
    // Set value in hidden input
    document.getElementById(hiddenInputId).value = value;
    
    // Reset active siblings
    const parentContainer = cardElement.parentElement;
    parentContainer.querySelectorAll('.select-card').forEach(card => card.classList.remove('active'));
    
    // Set clicked card active
    cardElement.classList.add('active');
}

/* ==========================================================================
   MODEL PREDICTION WORKFLOW
   ========================================================================== */
function handleFormSubmit(event) {
    event.preventDefault();

    // Collect variables
    const child_age_months = parseInt(document.getElementById('child_age_months').value);
    const birth_order = parseInt(document.getElementById('birth_order').value);
    const wealth_index = parseInt(document.getElementById('wealth_index').value);
    const highest_educational_level = parseInt(document.getElementById('highest_educational_level').value);
    
    // Helper to get binary (0/1) value from checkbox
    const getBinaryVal = (id) => document.getElementById(id).checked ? 1 : 0;

    const payload = {
        child_age_months: child_age_months,
        birth_order: birth_order,
        wealth_index: wealth_index,
        highest_educational_level: highest_educational_level,
        residence_urban: getBinaryVal('residence_urban'),
        has_automobile: getBinaryVal('has_automobile'),
        mothers_age_gt_35: getBinaryVal('mothers_age_gt_35'),
        antenatal_visits_yes: getBinaryVal('antenatal_visits_yes'),
        institutional_delivery: getBinaryVal('institutional_delivery'),
        health_worker_visit: getBinaryVal('health_worker_visit'),
        recieves_icds_benefits: getBinaryVal('recieves_icds_benefits'),
        media_exposure: getBinaryVal('media_exposure'),
        facility_distance_issue: getBinaryVal('facility_distance_issue')
    };

    // UI Loading state
    document.getElementById('results-placeholder').classList.add('hidden');
    document.getElementById('results-content').classList.add('hidden');
    document.getElementById('results-loading').classList.remove('hidden');

    // API Call
    fetch('/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Prediction API network response failed');
        }
        return response.json();
    })
    .then(data => {
        // Hide loader, show result content
        document.getElementById('results-loading').classList.add('hidden');
        document.getElementById('results-content').classList.remove('hidden');

        renderPredictionResults(data, payload);
    })
    .catch(error => {
        console.error('Error fetching prediction:', error);
        document.getElementById('results-loading').classList.add('hidden');
        document.getElementById('results-placeholder').classList.remove('hidden');
        alert('An error occurred during prediction evaluation. Please try again.');
    });
}

function renderPredictionResults(data, inputs) {
    const prob = data.probability;
    const isVaccinated = data.vaccinated === 1;
    
    // Elements
    const resultsPanel = document.getElementById('results-panel');
    const badge = document.getElementById('prediction-badge');
    const percentText = document.getElementById('prob-percentage');
    const desc = document.getElementById('result-description');
    const gaugeFill = document.getElementById('gauge-progress');
    
    // Reset classes
    resultsPanel.classList.remove('state-vaccinated', 'state-unvaccinated');

    // Gauge circle calculation (circumference is 314 px for r=50)
    const strokeDashOffset = 314 * (1 - prob);
    gaugeFill.style.strokeDashoffset = strokeDashOffset;

    // Text animations
    animateValue(percentText, 0, Math.round(prob * 100), 1200);

    if (isVaccinated) {
        resultsPanel.classList.add('state-vaccinated');
        badge.textContent = "Vaccinated";
        desc.textContent = `The machine learning model classifies this child as likely to be Vaccinated. The socio-demographic indicators suggest robust healthcare access and support mechanisms (Probability: ${(prob*100).toFixed(1)}%).`;
    } else {
        resultsPanel.classList.add('state-unvaccinated');
        badge.textContent = "Not Vaccinated";
        desc.textContent = `The model identifies this child as high-risk for being Unvaccinated or Under-vaccinated (Probability: ${((1-prob)*100).toFixed(1)}% risk). Follow-up healthcare intervention is recommended.`;
    }

    // Actionable Insights generation based on input features
    const insightsList = document.getElementById('insights-list');
    insightsList.innerHTML = ''; // clear

    let insightsCount = 0;

    // Check health worker visit
    if (inputs.health_worker_visit === 0) {
        addInsight("No health worker visited the household in the last 12 months. Request a local auxiliary nurse midwife (ANM) or Accredited Social Health Activist (ASHA) community outreach visit.", "fa-house-medical");
        insightsCount++;
    }

    // Check facility distance
    if (inputs.facility_distance_issue === 1) {
        addInsight("Distance to health facilities is reported as a major hurdle. Leverage mobile clinics, immunizations camps, or sub-center services scheduled in the local community.", "fa-map-pin");
        insightsCount++;
    }

    // Check ICDS benefits
    if (inputs.recieves_icds_benefits === 0) {
        addInsight("The household is not receiving ICDS benefits. Register the child and mother at the nearest Anganwadi Center to receive vaccines, nutritional supplements, and educational support.", "fa-bowl-food");
        insightsCount++;
    }

    // Check Antenatal Care
    if (inputs.antenatal_visits_yes === 0) {
        addInsight("Lack of antenatal visits recorded. For future pregnancies, register with institutional antenatal care programs early to establish contact with vaccination databases.", "fa-hospital-user");
        insightsCount++;
    }

    // Check media exposure
    if (inputs.media_exposure === 0) {
        addInsight("Limited exposure to regular media (newspaper/radio/TV). Set up voice/SMS alerts on mobile phones or arrange verbal home counseling to guide parents through the immunizations schedule.", "fa-mobile-screen-button");
        insightsCount++;
    }

    // Fallback if child is healthy or has no warnings
    if (insightsCount === 0) {
        addInsight("All tracked socioeconomic indicators look solid. Continue to log scheduled boosters (e.g. DPT, Polio, Measles-Rubella) to maintain the child's vaccine immunity status.", "fa-shield-heart");
    }
}

function addInsight(text, iconClass) {
    const list = document.getElementById('insights-list');
    const li = document.createElement('li');
    li.className = 'insight-item';
    li.innerHTML = `
        <i class="fa-solid ${iconClass} insight-icon"></i>
        <span>${text}</span>
    `;
    list.appendChild(li);
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start) + "%";
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

/* ==========================================================================
   ANALYTICS & CHART.JS SYSTEMS
   ========================================================================== */
function fetchAnalyticsData() {
    fetch('/analytics')
    .then(res => {
        if (!res.ok) throw new Error('Analytics API failed');
        return res.json();
    })
    .then(data => {
        // Set stats
        document.getElementById('stat-total-records').textContent = data.total_records.toLocaleString();
        document.getElementById('stat-vaccinated-records').textContent = data.vaccinated_count.toLocaleString();
        document.getElementById('stat-overall-rate').textContent = `${data.overall_rate}%`;

        // Render Charts
        const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        renderCharts(data, theme);
        analyticsLoaded = true;
    })
    .catch(err => {
        console.error("Error loading analytics:", err);
        alert("Unable to load analytics charts from server. Verify data/final_df.xlsx file exists.");
    });
}

function renderCharts(data, currentTheme) {
    const config = themeColors[currentTheme];
    
    // Clear previous charts if they exist
    Object.keys(charts).forEach(key => {
        if (charts[key]) charts[key].destroy();
    });

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: config.cardBg,
                titleColor: currentTheme === 'dark' ? '#fff' : '#000',
                bodyColor: config.text,
                borderColor: config.grid,
                borderWidth: 1,
                callbacks: {
                    label: function(context) {
                        return `Vaccination Rate: ${context.parsed.y.toFixed(1)}%`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: config.text, font: { family: 'Inter' } }
            },
            y: {
                grid: { color: config.grid },
                ticks: { 
                    color: config.text, 
                    font: { family: 'Inter' },
                    callback: value => `${value}%`
                },
                min: 0,
                max: 100
            }
        }
    };

    // 1. Wealth Index Chart (Bar)
    const ctxWealth = document.getElementById('chart-wealth').getContext('2d');
    const gradWealth = ctxWealth.createLinearGradient(0, 0, 0, 280);
    gradWealth.addColorStop(0, config.accent1);
    gradWealth.addColorStop(1, config.accent2);

    charts.wealth = new Chart(ctxWealth, {
        type: 'bar',
        data: {
            labels: Object.keys(data.wealth_chart),
            datasets: [{
                data: Object.values(data.wealth_chart),
                backgroundColor: gradWealth,
                borderRadius: 8,
                barPercentage: 0.5
            }]
        },
        options: commonOptions
    });

    // 2. Education Chart (Line)
    const ctxEdu = document.getElementById('chart-education').getContext('2d');
    charts.education = new Chart(ctxEdu, {
        type: 'line',
        data: {
            labels: Object.keys(data.education_chart),
            datasets: [{
                data: Object.values(data.education_chart),
                borderColor: config.accent2,
                backgroundColor: 'rgba(0, 242, 254, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: config.accent2,
                pointBorderColor: '#fff',
                pointHoverRadius: 6
            }]
        },
        options: commonOptions
    });

    // 3. Health Worker Visit Chart (Bar)
    const ctxHw = document.getElementById('chart-hw').getContext('2d');
    const gradHw = ctxHw.createLinearGradient(0, 0, 0, 280);
    gradHw.addColorStop(0, '#10b981');
    gradHw.addColorStop(1, '#059669');

    charts.hw = new Chart(ctxHw, {
        type: 'bar',
        data: {
            labels: Object.keys(data.health_worker_chart),
            datasets: [{
                data: Object.values(data.health_worker_chart),
                backgroundColor: gradHw,
                borderRadius: 8,
                barPercentage: 0.4
            }]
        },
        options: commonOptions
    });

    // 4. Residence Chart (Bar)
    const ctxRes = document.getElementById('chart-residence').getContext('2d');
    const gradRes = ctxRes.createLinearGradient(0, 0, 0, 280);
    gradRes.addColorStop(0, '#f59e0b');
    gradRes.addColorStop(1, '#d97706');

    charts.residence = new Chart(ctxRes, {
        type: 'bar',
        data: {
            labels: Object.keys(data.residence_chart),
            datasets: [{
                data: Object.values(data.residence_chart),
                backgroundColor: gradRes,
                borderRadius: 8,
                barPercentage: 0.4
            }]
        },
        options: commonOptions
    });
}

function updateChartsTheme(theme) {
    if (!analyticsLoaded) return;
    
    const config = themeColors[theme];
    
    Object.keys(charts).forEach(key => {
        const chart = charts[key];
        
        // Update scales ticks and grid colors
        chart.options.scales.x.ticks.color = config.text;
        chart.options.scales.y.ticks.color = config.text;
        chart.options.scales.y.grid.color = config.grid;
        chart.options.plugins.tooltip.backgroundColor = config.cardBg;
        chart.options.plugins.tooltip.titleColor = theme === 'dark' ? '#fff' : '#000';
        chart.options.plugins.tooltip.bodyColor = config.text;
        chart.options.plugins.tooltip.borderColor = config.grid;

        // For Wealth Chart gradient redraw
        if (key === 'wealth') {
            const ctx = chart.ctx;
            const grad = ctx.createLinearGradient(0, 0, 0, 280);
            grad.addColorStop(0, config.accent1);
            grad.addColorStop(1, config.accent2);
            chart.data.datasets[0].backgroundColor = grad;
        }

        // For Education Chart line color redraw
        if (key === 'education') {
            chart.data.datasets[0].borderColor = config.accent2;
            chart.data.datasets[0].pointBackgroundColor = config.accent2;
            chart.data.datasets[0].backgroundColor = theme === 'dark' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(14, 165, 233, 0.08)';
        }
        
        chart.update();
    });
}
