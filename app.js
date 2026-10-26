let currentStep = 0;
const totalSteps = 10;
let testFlow = [];
let userAnswers = [];
let deferredPrompt = null;

// Klinik Ishihara Paletleri (Gereksiz renk karmaşasından arındırılmış net renk çiftleri)
const PALETTES = {
    normal: {
        name: "Standart Renk Algısı",
        bgColors: ["#d97706", "#f59e0b"], // Net Turuncu Tonlar
        targetColors: ["#16a34a"]         // Net Yeşil Ton
    },
    protan: { // Kırmızı Körlüğü
        name: "Protanopi (Kırmızı Körlüğü)",
        bgColors: ["#b45309", "#d97706"], // Kahve / Turuncu Tonlar
        targetColors: ["#0284c7"]         // Net Mavi Ton
    },
    deutan: { // Yeşil Körlüğü
        name: "Deuteranopi (Yeşil Körlüğü)",
        bgColors: ["#ca8a04", "#eab308"], // Hardal / Sarı Tonlar
        targetColors: ["#db2777"]         // Net Pembe / Kırmızı Ton
    },
    tritan: { // Mavi-Sarı Körlüğü
        name: "Tritanopi (Mavi-Sarı Körlüğü)",
        bgColors: ["#e11d48", "#f43f5e"], // Kırmızı Tonlar
        targetColors: ["#0d9488"]         // Net Turkuaz Ton
    }
};

function initTestFlow() {
    const types = ['normal', 'protan', 'deutan', 'tritan'];
    testFlow = [];
    
    // 5 Sayı Girişi
    for (let i = 0; i < 5; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        testFlow.push({
            mode: 'input',
            paletteType: type,
            targetNumber: [3, 5, 7, 12, 15, 29, 45, 74, 8][Math.floor(Math.random() * 9)]
        });
    }
    
    // 5 Dokunma Testi
    for (let i = 0; i < 5; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        testFlow.push({
            mode: 'touch',
            paletteType: type,
            targetNumber: null
        });
    }
    
    testFlow.sort(() => Math.random() - 0.5);
}

const welcomeScreen = document.getElementById('welcome-screen');
const testScreen = document.getElementById('test-screen');
const resultScreen = document.getElementById('result-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const svgContainer = document.getElementById('svg-container');
const currentStepEl = document.getElementById('current-step');
const progressBarEl = document.getElementById('progress-bar');
const testTypeBadge = document.getElementById('test-type-badge');
const instructionText = document.getElementById('instruction-text');
const inputMode = document.getElementById('input-mode');
const touchMode = document.getElementById('touch-mode');
const numberInput = document.getElementById('number-input');
const submitNumberBtn = document.getElementById('submit-number-btn');
const metricsContainer = document.getElementById('metrics-container');
const installBtn = document.getElementById('install-btn');

startBtn.addEventListener('click', startTest);
restartBtn.addEventListener('click', startTest);

function startTest() {
    currentStep = 0;
    userAnswers = [];
    initTestFlow();
    welcomeScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    testScreen.classList.add('active');
    loadStep();
}

function loadStep() {
    if (currentStep >= totalSteps) {
        showResults();
        return;
    }

    const stepData = testFlow[currentStep];
    currentStepEl.textContent = `Aşama ${currentStep + 1}/${totalSteps}`;
    progressBarEl.style.width = `${((currentStep + 1) / totalSteps) * 100}%`;
    testTypeBadge.textContent = PALETTES[stepData.paletteType].name;

    if (stepData.mode === 'input') {
        instructionText.textContent = `Dairenin içerisine gizlenmiş olan net sayıyı giriniz:`;
        inputMode.classList.add('active');
        touchMode.classList.remove('active');
        numberInput.value = '';
        numberInput.focus();
    } else {
        instructionText.textContent = `Plakanın içerisindeki farklı renge sahip gizli bölgeye dokununuz.`;
        inputMode.classList.remove('active');
        touchMode.classList.add('active');
    }

    generateIshiharaSVG(stepData);
}

// Net, Düzenli ve Okunabilir Ishihara Plaka Oluşturucu
function generateIshiharaSVG(stepData) {
    svgContainer.innerHTML = '';
    const width = 320;
    const height = 320;
    const palette = PALETTES[stepData.paletteType];

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    // Arka plan ana daire
    const bgCircle = document.createElementNS(svgNS, "circle");
    bgCircle.setAttribute("cx", width / 2);
    bgCircle.setAttribute("cy", height / 2);
    bgCircle.setAttribute("r", width / 2 - 4);
    bgCircle.setAttribute("fill", palette.bgColors[0]);
    svg.appendChild(bgCircle);

    // Maske için Offscreen Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let targetTouchCoords = { x: 160, y: 160 };

    if (stepData.mode === 'input') {
        ctx.font = 'bold 125px Inter, sans-serif';
        ctx.fillText(stepData.targetNumber, width / 2, height / 2 + 5);
    } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = 45 + Math.random() * 30;
        targetTouchCoords.x = width / 2 + Math.cos(angle) * dist;
        targetTouchCoords.y = height / 2 + Math.sin(angle) * dist;

        ctx.beginPath();
        ctx.arc(targetTouchCoords.x, targetTouchCoords.y, 42, 0, Math.PI * 2);
        ctx.fill();
    }

    const imgData = ctx.getImageData(0, 0, width, height);

    // Düzenli ve net nokta yerleşimi (Sabit boyutlar ile kargaşa önlenir)
    const dots = [];
    const maxDots = 550; 
    
    for (let i = 0; i < maxDots; i++) {
        const rRadius = 7 + (i % 3) * 1.5; // Sabit ve temiz boyutlar (7, 8.5, 10px)
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * (width / 2 - 16);
        const x = Math.round(width / 2 + distance * Math.cos(angle));
        const y = Math.round(height / 2 + distance * Math.sin(angle));

        if (distance > width / 2 - rRadius - 4) continue;

        let overlap = false;
        for (let d of dots) {
            const dx = d.x - x;
            const dy = d.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < d.r + rRadius + 2) {
                overlap = true;
                break;
            }
        }

        if (!overlap) {
            const pixelIndex = (y * width + x) * 4;
            const isTarget = imgData.data[pixelIndex] > 128;

            const colorList = isTarget ? palette.targetColors : palette.bgColors;
            const color = colorList[Math.floor(Math.random() * colorList.length)];

            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", y);
            circle.setAttribute("r", rRadius);
            circle.setAttribute("fill", color);

            if (stepData.mode === 'touch') {
                const distToTarget = Math.sqrt((x - targetTouchCoords.x)**2 + (y - targetTouchCoords.y)**2);
                if (distToTarget < 42) {
                    circle.setAttribute("data-target", "true");
                    circle.style.cursor = "pointer";
                    circle.addEventListener('click', () => handleTouchAnswer(true));
                    circle.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        handleTouchAnswer(true);
                    });
                }
            }

            svg.appendChild(circle);
            dots.push({ x, y, r: rRadius });
        }
    }

    if (stepData.mode === 'touch') {
        svg.addEventListener('click', (e) => {
            if (e.target.tagName === 'svg' || e.target === bgCircle) {
                handleTouchAnswer(false);
            }
        });
    }

    svgContainer.appendChild(svg);
}

submitNumberBtn.addEventListener('click', () => {
    const val = parseInt(numberInput.value);
    const stepData = testFlow[currentStep];
    const isCorrect = val === stepData.targetNumber;
    
    userAnswers.push({
        step: currentStep,
        type: stepData.paletteType,
        correct: isCorrect
    });

    currentStep++;
    loadStep();
});

function handleTouchAnswer(isCorrect) {
    const stepData = testFlow[currentStep];
    userAnswers.push({
        step: currentStep,
        type: stepData.paletteType,
        correct: isCorrect
    });

    currentStep++;
    loadStep();
}

function showResults() {
    testScreen.classList.remove('active');
    resultScreen.classList.add('active');

    let scores = { normal: 0, protan: 0, deutan: 0, tritan: 0 };
    let totalErrors = 0;

    userAnswers.forEach(ans => {
        if (!ans.correct) {
            scores[ans.type]++;
            totalErrors++;
        }
    });

    let primaryConcern = "Normal Görme (Renk Algısı Sağlıklı)";
    let icon = "✅";
    let maxErr = -1;

    for (let type in scores) {
        if (type !== 'normal' && scores[type] > maxErr) {
            maxErr = scores[type];
            if (maxErr >= 2) {
                if (type === 'protan') primaryConcern = "Protanopi (Kırmızı Körlüğü) Şüphesi";
                if (type === 'deutan') primaryConcern = "Deuteranopi (Yeşil Körlüğü) Şüphesi";
                if (type === 'tritan') primaryConcern = "Tritanopi (Mavi-Sarı Körlüğü) Şüphesi";
                icon = "⚠️";
            }
        }
    }

    document.getElementById('result-main-icon').textContent = icon;
    document.getElementById('result-title').textContent = primaryConcern;
    document.getElementById('result-subtitle').textContent = `Toplam ${totalErrors} hata tespit edildi.`;

    metricsContainer.innerHTML = '';
    const labels = {
        protan: 'Protan (Kırmızı) Hassasiyeti',
        deutan: 'Deutan (Yeşil) Hassasiyeti',
        tritan: 'Tritan (Mavi-Sarı) Hassasiyeti'
    };

    for (let type in labels) {
        const errCount = scores[type];
        const percentage = Math.min(100, (errCount / 3) * 100);
        
        const metricCard = document.createElement('div');
        metricCard.className = 'metric-card';
        metricCard.innerHTML = `
            <div class="metric-info">
                <span>${labels[type]}</span>
                <span>${errCount} Hata</span>
            </div>
            <div class="metric-bar-bg">
                <div class="metric-bar-fill" style="width: ${percentage}%; background: ${errCount >= 2 ? '#ef4444' : '#4f46e5'};"></div>
            </div>
        `;
        metricsContainer.appendChild(metricCard);
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') installBtn.style.display = 'none';
        deferredPrompt = null;
    }
});