let countdownDuration = 40; // số giây mỗi phiên
let lastSpinTime = parseInt(localStorage.getItem("lastSpinTime")) || Date.now();
let pauseAfterSpin = false;
let pauseTimer = 0;
let autoInterval;


let spinCount = parseInt(localStorage.getItem("spinCount")) || 0;
let wheelRotation = 0;
let spinInterval;
let isSpinning = false;
// Lấy balance từ localStorage (nếu có)
let balance = parseInt(localStorage.getItem("balance")) || 0;
let jackpot = parseInt(localStorage.getItem("jackpot")) || 0;
let netProfit = parseInt(localStorage.getItem("netProfit")) || 0; // Chênh lệch xu lời
let netLoss = parseInt(localStorage.getItem("netLoss")) || 0;   // Chênh lệch xu lỗ
let currentChip = 0; // chip đang chọn
let bets = {}; // lưu trữ cược hiện tại // lưu số xu đặt cược theo từng cửa

const SPIN_DURATION = 40; // 40 giây 1 phiên
const spinCounterEl = document.getElementById("spinCounter");
const balanceEl = document.getElementById("balance");
const jackpotEl = document.getElementById("jackpot");
const notificationEl = document.getElementById("notification");
const historyEl = document.getElementById("history");
const betHistoryEl = document.getElementById("betHistory");
const JACKPOT_THRESHOLD = 5000;
const JACKPOT_CHANCE = 0.01;
const wheelEl = document.getElementById("wheel");
const options = [
    { name: "Chua", icon: "🍅", weight: 19.2, reward: 5 },
    { name: "Cải", icon: "🥬", weight: 19.2, reward: 5 },
    { name: "Ngô", icon: "🌽", weight: 19.2, reward: 5 },
    { name: "Rốt", icon: "🥕", weight: 19.2, reward: 5 },
    { name: "Mỳ", icon: "🌭", weight: 10, reward: 10 },
    { name: "Xiên", icon: "🍢", weight: 6.67, reward: 15 },
    { name: "Đùi", icon: "🍖", weight: 4, reward: 25 },
    { name: "Bò", icon: "🥩", weight: 2.53, reward: 45 },
];



// Hàm thêm lịch sử đặt cược
function addBetHistory(betName, amount) {
    const time = new Date().toLocaleTimeString();
    const entry = { time, betName, amount };

    // Thêm vào giao diện
    betHistoryEl.innerHTML += `⏰ ${time} - Đặt ${amount} xu vào ${betName}<br>`;

    // Lưu vào localStorage
    let betHistory = JSON.parse(localStorage.getItem("betHistory")) || [];
    betHistory.push(entry);
    localStorage.setItem("betHistory", JSON.stringify(betHistory));
}

// Khôi phục khi load lại trang
window.addEventListener("load", () => {
    let betHistory = JSON.parse(localStorage.getItem("betHistory")) || [];
    if (betHistory.length > 0) {
        betHistoryEl.innerHTML = "🧾 <b>Lịch sử đặt cược:</b><br>";
        betHistory.forEach(entry => {
            betHistoryEl.innerHTML += `⏰ ${entry.time} - Đặt ${entry.amount} xu vào ${entry.betName}<br>`;
        });
    }
});

function resetHistoryDaily() {
    let today = new Date().toLocaleDateString();
    let savedDate = localStorage.getItem("betHistoryDate");
    if (savedDate !== today) {
        localStorage.removeItem("betHistory");
        localStorage.setItem("betHistoryDate", today);
    }
}
resetHistoryDaily();

// Lấy mốc 0h hôm nay
function getStartOfDay() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
}

// Tính số phiên hiện tại
function getCurrentSpinNumber() {
    const startTime = getStartOfDay();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    return Math.floor(elapsedSeconds / SPIN_DURATION) + 1;
}




document.querySelectorAll('#betForm input').forEach(input => {
    input.addEventListener('input', updateTotalBetDisplay);
});


// Nếu chưa có thì set mốc ban đầu
if (!lastSpinTime) {
    lastSpinTime = Date.now();
    localStorage.setItem("lastSpinTime", lastSpinTime);
}

// Tính thời gian còn lại khi load lại trang
function getRemainingTime() {
    const now = Date.now();
    const elapsed = Math.floor((now - lastSpinTime) / 1000); // số giây đã trôi qua
    let remaining = countdownDuration - elapsed;

    if (remaining <= 0) {
        lastSpinTime = now;
        localStorage.setItem("lastSpinTime", lastSpinTime);
        remaining = countdownDuration;
    }
    return remaining;
}

let countdownValue = getRemainingTime();

// Hàm render ra giao diện ngay lập tức
function renderCountdown() {
    const countdownEl = document.getElementById("autoCountdown");
    countdownEl.innerHTML = `<span id="countdownValue">${countdownValue}</span>`;
}

//Hiển thị ngay khi load
renderCountdown();


// Hiển thị đếm ngược
function startCountdown() {
    const timer = setInterval(() => {
        const countdownEl = document.getElementById("autoCountdown");
        // Nếu đang trong thời gian chờ sau khi quay
        if (pauseAfterSpin) {
            if (pauseTimer > 0) {
                countdownEl.innerHTML = `<span>${pauseTimer}</span>`;
                countdownEl.classList.add("blink-yellow"); // vàng nhấp nháy
                pauseTimer--;
            }
            else {
                countdownValue = 35; // reset về 35 giây
                pauseAfterSpin = false;
                countdownEl.classList.remove("blink-yellow");
                renderCountdown(); // hiển thị lại
                countdownEl.innerHTML = `<span id="countdownValue">${countdownValue}</span>`;
            }
            return;
        }
        countdownValue--;
        countdownEl.textContent = `${countdownValue}`;
        if (countdownValue === 20) {
            suggestResult();
        }
        if (countdownValue <= 5) {
            countdownEl.classList.add("blink"); // đỏ nhấp nháy
        }
        else {
            countdownEl.classList.remove("blink");
        }
        countdownEl.innerHTML = `<span id="countdownValue">${countdownValue}</span>`;

        if (countdownValue <= 0) {
            if (!isSpinning) {
                spinWheel();
                startDoorAnimation();
            }
            // Sau khi quay thì pause 4 giây
            pauseAfterSpin = true;
            pauseTimer = 4;
            countdownEl.classList.remove("blink"); // tắt đỏ nhấp nháy

            lastSpinTime = Date.now();
            localStorage.setItem("lastSpinTime", lastSpinTime);
            countdownValue = countdownDuration;
        }
        renderCountdown(); // cập nhật mỗi giây
        countdownEl.innerHTML = `<span id="countdownValue">${countdownValue}</span>`;
    }, 1000);
}
startCountdown();

function suggestResult() {
    const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
    let rand = Math.random() * totalWeight;
    let cumWeight = 0;
    for (let opt of options) {
        cumWeight += opt.weight;
        if (rand <= cumWeight) {
            const hotText = `🔥 Hot: ${opt.name} ${opt.icon}`;
            document.getElementById("suggestion").textContent = hotText;
            localStorage.setItem("lastHot", hotText); // 🔥 Lưu vào localStorage
            return;
        }
    }
}

//Khi load lại trang, hiển thị lại Hot nếu có
const savedHot = localStorage.getItem("lastHot");
if (savedHot) {
    document.getElementById("suggestion").textContent = savedHot;
}

function updateBalance() {
    document.getElementById("balance").textContent = balance;
}

// Hiển thị giao diện rút xu
document.getElementById("withdrawBtn").onclick = () => {
    document.getElementById("withdrawPanel").style.display = "block";
};




// Xử lý rút xu
document.getElementById("confirmWithdraw").onclick = () => {
    const name = document.getElementById("userName").value;
    const account = document.getElementById("userAccount").value;
    const amount = parseInt(document.getElementById("withdrawAmount").value);
    const status = document.getElementById("withdrawStatus");
    const modal = document.getElementById("withdrawConfirmModal");
    const confirmText = document.getElementById("withdrawConfirmText");

    if (!name || !account || !amount || amount <= 0) {
        status.textContent = "⚠️ Vui lòng điền đầy đủ thông tin hợp lệ.";
        status.style.color = "red";
        return;
    }

    if (amount > balance) {
        status.textContent = "⚠️ Số dư không đủ để rút.";
        status.style.color = "red";
        return;
    }

    // Hiển thị modal xác nhận
    confirmText.textContent = `Bạn có chắc chắn muốn rút ${amount} xu không?`;
    modal.style.display = "flex";

    // Nếu bấm Hủy
    document.getElementById("confirmNo").onclick = () => {
        modal.style.display = "none";
        status.textContent = "❌ Yêu cầu rút đã bị hủy.";
        status.style.color = "red";
    };

    // Nếu bấm Xác nhận
    document.getElementById("confirmYes").onclick = () => {
        modal.style.display = "none";

        // Trừ xu sau khi xác nhận
        balance -= amount;
        updateBalance();

        // Hiện thông báo chờ xử lý
        let timeLeft = 35;
        status.style.color = "orange";
        status.textContent = `⏳ Gửi yêu cầu thành công, hệ thống đang xử lý...`;

        const countdown = setInterval(() => {
            timeLeft--;
            status.textContent = `⏳ Gửi yêu cầu thành công, hệ thống đang xử lý...`;
            if (timeLeft <= 0) {
                clearInterval(countdown);



                status.textContent = `Yêu cầu rút xu đã được phê duyệt!`;
                status.style.color = "lightgreen";
                document.getElementById("notification").textContent = `Rút xu thành công, tiền đang được chuyển tới tài khoản, vui lòng đợi!`;
                // Ẩn giao diện sau 5s
                setTimeout(() => {
                    document.getElementById("withdrawPanel").style.display = "none";
                    status.textContent = "";
                }, 5000);
            }
        }, 1000);
    };
};

function showBankInfo() {
    const amount = parseInt(document.getElementById("amount").value) || 0;
    if (amount > 0) {
        document.getElementById("bankInfo").style.display = "block";
        document.getElementById("depositStatus").textContent = 'Bấm gửi yêu cầu nạp sau khi chuyển khoản.';
    } else {
        alert("Vui lòng nhập số xu muốn nạp!");
    }
}

function sendDepositRequest() {
    const amount = parseInt(document.getElementById("amount").value) || 0;
    if (amount > 0) {
        if (confirm(` Xác nhận chuyển khoản thành công !`)) {
            // Hiện thông tin ngân hàng
            document.getElementById("bankInfo").style.display = "block";
            // Trạng thái chờ
            const status = document.getElementById("depositStatus");
            let timeLeft = 35;
            status.style.color = "orange";
            status.textContent = `⏳ Gửi yêu cầu thành công, hệ thống đang xử lý...`;
            // Đếm ngược 30s rồi cộng xu
            const countdown = setInterval(() => {
                timeLeft--;
                if (timeLeft <= 0) {
                    clearInterval(countdown);
                    deposit(amount);
                    status.textContent = `✅ Nạp thành công ${amount} xu vào tài khoản!`;
                    status.style.color = "lightgreen";
                    document.getElementById("notification").textContent = `Nạp thành công +${amount} xu.`;

                    // Sau 5 giây ẩn giao diện ngân hàng
                    setTimeout(() => {
                        document.getElementById("bankInfo").style.display = "none";
                    }, 5000);
                }
            }, 1000);
        }
    } else {
        alert("Vui lòng nhập số xu muốn nạp!");
    }
}


function updateBetDisplay() {
    document.querySelectorAll(".bet-box").forEach(box => {
        const name = box.dataset.name;
        box.querySelector(".bet-amount").textContent = bets[name];
    });
    const total = Object.values(bets).reduce((a, b) => a + b, 0);
    document.getElementById("totalBetDisplay").textContent = `Tổng cược: ${total}`;
}


function updateJackpotDisplay() {
    jackpotEl.textContent = jackpot.toFixed(0);
}

function updateBalanceDisplay() {
    balanceEl.textContent = balance;
    localStorage.setItem("balance", balance); // lưu vào localStorage
}

function showNotification(message) {
    notificationEl.textContent = message;
    setTimeout(() => notificationEl.textContent = "", 3000);
}

function confirmDeposit() {
    const amount = parseInt(document.getElementById("amount").value) || 0;
    if (amount > 0 && confirm(`Xác nhận nạp ${amount} xu?`)) {
        showBankInfo();

        // Hiện thông tin ngân hàng
        document.getElementById("bankInfo").style.display = "block";
    }
}

function confirmWithdraw() {
    const amount = parseInt(document.getElementById("amount").value);
    const balanceEl = document.getElementById("balance");
    if (isNaN(amount) || amount <= 0) {
        alert("Vui lòng nhập số xu hợp lệ để rút.");
        return;
    }
    if (amount > balance) {
        alert("Không thể rút xu vì số dư không đủ.");
        return;
    }
    if (confirm(`Bạn có chắc muốn rút ${amount} xu không?`)) {
        balance -= amount;
        balanceEl.textContent = balance;
        document.getElementById("notification").textContent = `Rút xu thành công -${amount}`;
    }
}

function deposit(amount) {
    balance += amount;
    updateBalanceDisplay();
}

function withdraw(amount) {
    balance -= amount;
    updateBalanceDisplay();
    showNotification(`-${amount} xu đã được rút.`);
}

function confirmClearBetHistory() {
    if (confirm("Bạn có chắc muốn xóa lịch sử đặt cược?")) {
        clearBetHistory();
    }
}

function confirmClearResultHistory() {
    if (confirm("Bạn có chắc muốn xóa lịch sử kết quả?")) {
        clearResultHistory();
    }
}

function clearBetHistory() {
    betHistoryEl.innerHTML = "🧾 <b>Lịch sử đặt cược:</b><br>";
}

function clearResultHistory() {
    historyEl.innerHTML = "🌡 <b>Lịch sử kết quả:</b><br>";
}

function renderWheel() {
    const angleStep = 360 / options.length;
    wheelEl.innerHTML = ""; // xóa cũ
    options.forEach((opt, index) => {
        const segment = document.createElement("div");
        segment.className = "segment";
        segment.textContent = opt.icon;
        segment.style.transform = `rotate(${index * angleStep}deg) translate(0, -85%)`;
        wheelEl.appendChild(segment);
    });
}
renderWheel();

/// Hàm thêm kết quả vào lịch sử (giữ tối đa 8)
function addResultToHistory(icon) {
    let Results = JSON.parse(localStorage.getItem("Results")) || [];

    // thêm kết quả mới vào đầu mảng
    Results.unshift(icon);

    // giới hạn 8 kết quả
    if (Results.length > 8) {
        Results = Results.slice(0, 8);
    }

    // lưu lại
    localStorage.setItem("Results", JSON.stringify(Results));

    // cập nhật hiển thị
    renderHistory();
}

// Lưu lịch sử vào localStorage
function saveHistory() {
    const data = historyEl.innerHTML.replace('🧾 <b>Lịch sử kết quả:</b><br>', '');
    localStorage.setItem("historyData", data);
}

// Khôi phục lịch sử khi F5
function loadHistory() {
    const saved = localStorage.getItem("historyData");
    if (saved) {
        historyEl.innerHTML = '🧾 <b>Lịch sử kết quả:</b><br>' + saved;
    }
}

// Gọi khi trang load
window.addEventListener("load", loadHistory);

function addHistory(resultIcon) {
    saveHistory();
}

// Hàm hiển thị lịch sử ra giao diện
function renderHistory() {
    const historyEl = document.getElementById("history");
    historyEl.innerHTML = "🧾 <b>Lịch sử kết quả:</b><br>";
    let Results = JSON.parse(localStorage.getItem("Results")) || [];
    Results.forEach(icon => {
        const span = document.createElement("span");
        span.className = "result-item";
        span.textContent = icon + " ";
        historyEl.appendChild(span);
    });

}




// gọi khi tải lại trang để load lịch sử cũ
window.onload = () => {
    renderHistory();
    updateBalanceDisplay(); // cũng load lại số dư đã lưu
};

function spinWheel() {
    if (isSpinning) return;
    isSpinning = true;
    document.querySelectorAll('.chip, .bet-box').forEach(chip => chip.classList.add('lock-bets'));
    const resultEl = document.getElementById("result");
    let totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
    for (let key in bets) {
        let val = parseFloat(bets[key]);
        if (isNaN(val) || val < 0) {
            resultEl.textContent = `❌ Cược không hợp lệ ở cửa ${key}`;
            return;
        }
    }
    document.getElementById("spinSound").play();
    resultEl.classList.add("spin-animating");
    setTimeout(() => {
        resultEl.classList.remove("spin-animating");
        highlightWinner(selected.name);
    }, 3000);
    const spinDuration = 5; // giây
    let countdown = spinDuration;
    const selected = weightedRandom(options, bets);
    const anglePerSegment = 360 / options.length;
    const selectedIndex = options.findIndex(opt => opt.name === selected.name);
    const randomOffset = Math.random() * anglePerSegment; // giúp kết quả trông tự nhiên hơn
    const targetAngle = (360 - (selectedIndex * anglePerSegment + anglePerSegment / 2) % 360);
    const extraSpins = 5;
    const targetRotation = 360 * extraSpins + targetAngle;
    wheelRotation += targetRotation;
    wheelEl.style.transform = `rotate(${wheelRotation}deg)`;
    const animationInterval = setInterval(() => {
        const tempIcon = options[Math.floor(Math.random() * options.length)].icon;
        resultEl.textContent = `${tempIcon}`;

        highlightWinner(selected.name);

    }, 100);



    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            clearInterval(animationInterval);
            const betAmount = bets[selected.name] || 0;
            const winAmount = betAmount > 0 ? betAmount * selected.reward : 0;
            balance += winAmount;
            updateBalanceDisplay();
            const lostAmount = totalBet - winAmount;
            let profitOrLoss = winAmount - totalBet;

            // Tích lũy hũ từ phần cược thua
            if (lostAmount > 0) {
                const jackpotContribution = Math.floor(lostAmount * 0.1); // 10% số xu thua
                jackpot += jackpotContribution;
                updateJackpotDisplay();
            }
            if (profitOrLoss > 0) {
                netProfit += profitOrLoss;
            }
            else if (profitOrLoss < 0) {
                netLoss += Math.abs(profitOrLoss);
            }
            updateStatsDisplay();
            addResultToHistory(selected.icon);
            let outcome = winAmount > 0 ? `✅ Thắng ${winAmount}` : `❌ Thua`;
            let jackpotWin = 0;
            if (jackpot >= JACKPOT_THRESHOLD && Math.random() < JACKPOT_CHANCE) {
                jackpotWin = Math.floor(jackpot * 0.8);
                jackpot -= jackpotWin;
                balance += jackpotWin;
                updateBalanceDisplay();
                updateJackpotDisplay();
                outcome += ` 🎉 Nổ hũ! Nhận thêm ${jackpotWin} xu từ hũ!`;
                showJackpotEffect();  // Hiển thị hiệu ứng pháo hoa + coin bay
            }
            if (totalBet > 0) {
                resultEl.textContent = `${selected.icon}`;
                // ✅ Lưu icon kết quả vào localStorage
                localStorage.setItem("lastResultIcon", result.icon);
                localStorage.setItem("lastResult", JSON.stringify(selected));
            }
            else {
                resultEl.textContent = `${selected.icon}`;

                // ✅ Lưu icon kết quả vào localStorage
                localStorage.setItem("lastResultIcon", result.icon);
                localStorage.setItem("lastResult", JSON.stringify(selected));
            }
            addHistory(result.icon);

            // Bật sáng cả ô đặt cược trúng
            const betBox = document.querySelector(`.bet-box[data-name="${selected.name}"]`);
            if (betBox) {
                betBox.classList.add('highlight-win');
                setTimeout(() => {
                    betBox.classList.remove('highlight-win');
                    document.querySelectorAll('.chip, .bet-box').forEach(chip => chip.classList.remove('lock-bets'));
                    //Tăng số phiên quay.
                    spinCount++;
                    document.getElementById("spinCounter").textContent = `🎯 Phiên quay: ${spinCount}`;
                    updateSpinCounter();
                    //Reset cược.
                    resetBets();

                    highlightWinner(selected.name);
                    isSpinning = false;
                    clearBets(); // 🔥 sang vòng mới thì không giữ cược nữa
                }, 5000);
            }
            if (winAmount >= 1000) {
                resultEl.classList.add("big-win-effect");
            }
            else if (winAmount > 0) {
                resultEl.classList.add("small-win-effect");
            }
            setTimeout(() => {
                resultEl.classList.remove("big-win-effect", "small-win-effect");
            }, 2000);

            //Hiện thị lịch sử cược.
            if (totalBet > 0) {
                let betLog = `${new Date().toLocaleTimeString()} - Cược: `;
                for (let key in bets) {
                    const val = parseFloat(bets[key]) || 0;
                    if (val > 0) betLog += `${key}: ${val} xu, `;
                }
                betLog += `→ Kết quả: ${selected.icon} - ${outcome}`;
                betHistoryEl.innerHTML += `🧾 ${betLog}<br>`;
            }
        }
    }, 1000);
}

// Hàm cập nhật giao diện + lưu
function updateSpinCounter() {
    const spinNumber = getCurrentSpinNumber();
    spinCounterEl.textContent = `🎯 Phiên quay: ${spinNumber}`;
    /*document.getElementById("spinCounter").textContent = `🎯 Phiên quay: ${spinCount}`;
    localStorage.setItem("spinCount", spinCount);
    localStorage.setItem("lastSpinDate", getToday());*/
}

// Khi load trang thì hiển thị số phiên đã lưu
updateSpinCounter();
setInterval(updateSpinCounter, 1000);

function weightedRandom(items, bets) {
    const adjustedItems = items.map(item => {
        const betAmount = parseFloat(bets[item.name]) || 0;
        let penaltyFactor = 1;
        if (betAmount > 0) {
            penaltyFactor = Math.max(0.2, 1 / (1 + betAmount / 10000000));
        }
        return { ...item, weight: item.weight * penaltyFactor };
    });
    const totalWeight = adjustedItems.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;
    let cumWeight = 0;
    for (let item of adjustedItems) {
        cumWeight += item.weight;
        if (rand <= cumWeight) {
            return item;
        }
    }
}

function confirmSpin() {
    const form = document.getElementById("betForm");
    const formData = new FormData(form);
    let totalBet = 0;
    for (const [key, value] of formData.entries()) {
        totalBet += parseInt(value || 0);
    }
    if (totalBet <= 0) {
        alert("Vui lòng đặt cược trước khi quay.");
        return;
    }
    if (confirm(`Tổng số xu đã đặt cược: ${totalBet}.\nBạn có chắc chắn muốn quay thưởng?`)) {
        spinWheel();
    }
}

/*//auto quay
  let autoTime = 35;
  let autoInterval;
  let pauseAfterSpin = false;
  let pauseTimer = 0;

  function startAutoSpinTimer() {
  autoInterval = setInterval(() => {
  const countdownEl = document.getElementById("autoCountdown");
// Nếu đang trong thời gian chờ sau khi quay
  if (pauseAfterSpin) {
  if (pauseTimer > 0) {
  countdownEl.textContent = `⏳ Đang chờ kết quả... ${pauseTimer}s`;
  countdownEl.classList.add("blink-yellow"); // vàng nhấp nháy
  pauseTimer--;
  } 
  else {
  autoTime = 35; // reset về 35 giây
  pauseAfterSpin = false;
  countdownEl.classList.remove("blink-yellow");
  countdownEl.textContent = `⏳ Quay thưởng sau: ${autoTime} giây`;
  }
  return;
  }
// Bình thường đếm ngược 35s
  autoTime--;
  countdownEl.textContent = `⏳ Quay thưởng sau: ${autoTime} giây`;
  if (autoTime === 20) {
    suggestResult();
  }
  if (autoTime <= 5) {
  countdownEl.classList.add("blink"); // đỏ nhấp nháy
  } 
  else {
  countdownEl.classList.remove("blink");
  }
  if (autoTime <= 0) {
  if (!isSpinning) {
  spinWheel();
  }

// Sau khi quay thì pause 4 giây
  pauseAfterSpin = true;
  pauseTimer = 4;
  countdownEl.classList.remove("blink"); // tắt đỏ nhấp nháy
  }
  }, 1000);
}*/

window.onload = function () {
    updateBalanceDisplay();
    updateJackpotDisplay();
    startAutoSpinTimer();
};

function showJackpotEffect() {
    const container = document.getElementById("jackpotEffect");
    container.innerHTML = "";
    // Coin bay xiên
    for (let i = 0; i < 20; i++) {
        const coin = document.createElement("div");
        coin.className = "coin";
        const x = `${(Math.random() - 0.5) * 300}px`;
        const y = `${-150 - Math.random() * 200}px`;
        coin.style.left = `${50 + Math.random() * 30 - 15}%`;
        coin.style.bottom = `0`;
        coin.style.setProperty('--x', x);
        coin.style.setProperty('--y', y);
        container.appendChild(coin);
    }
    // Fireworks nhiều màu
    const colors = ['#ff0', '#f0f', '#0ff', '#f55', '#5f5', '#55f', '#ffa500'];
    for (let i = 0; i < 10; i++) {
        const fw = document.createElement("div");
        fw.className = "firework";
        fw.style.left = `${40 + Math.random() * 20}%`;
        fw.style.top = `${30 + Math.random() * 30}%`;
        fw.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
        container.appendChild(fw);
    }
    // Mưa xu
    for (let i = 0; i < 30; i++) {
        const rain = document.createElement("div");
        rain.className = "rain-coin";
        rain.style.left = `${Math.random() * 100}%`;
        rain.style.animationDuration = `${2 + Math.random() * 2}s`;
        rain.style.animationDelay = `${Math.random() * 0.5}s`;
        container.appendChild(rain);
    }
    // Xoá hiệu ứng sau 3 giây
    setTimeout(() => container.innerHTML = "", 3000);
}

function updateTimeDisplay() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN', { hour12: false });
    document.getElementById("currentTime").textContent = timeString;
}
setInterval(updateTimeDisplay, 1000);
updateTimeDisplay(); // chạy ngay khi load

function updateStatsDisplay() {
    document.getElementById("stats").textContent =
        `📊 Lãi: ${netProfit} xu | Lỗ: ${netLoss} xu`;
    localStorage.setItem("netProfit", netProfit);
    localStorage.setItem("netLoss", netLoss);
}
updateStatsDisplay(); // gọi 1 lần khi load trang

function resetStats() {
    if (confirm("Reset thống kê lãi/lỗ?")) {
        netProfit = 0;
        netLoss = 0;
        updateStatsDisplay();
    }
}

function updateJackpotDisplay() {
    jackpotEl.textContent = jackpot.toFixed(0);
    localStorage.setItem("jackpot", jackpot); // 🔥 lưu lại jackpot
    document.getElementById("jackpotProgress").value = jackpot;
}

// 🔹 Hiển thị ngay khi load trang
updateJackpotDisplay();

if (jackpot >= JACKPOT_THRESHOLD) {
    document.querySelector('button[onclick="confirmSpin()"]').classList.add('glow');
}


// --- CHIP CHỌN TIỀN CƯỢC ---

// Khởi tạo cược = 0 cho tất cả
document.querySelectorAll(".bet-box").forEach(box => {
    bets[box.dataset.name] = 0;
});


// --- chọn chip ---
document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentChip = parseInt(chip.dataset.value);
    });
});

// --- đặt cược bằng click ô ---
document.querySelectorAll(".bet-box").forEach(box => {
    box.addEventListener("click", () => {
        if (!currentChip) {
            alert("Hãy chọn mệnh giá chip trước!");
            return;
        }
        if (balance < currentChip) {
            alert("Không đủ số dư để đặt cược!");
            return;
        }
        if (currentChip > 0) {
            const name = box.dataset.name;
            bets[name] = Number(bets[name] || 0) + Number(currentChip);
            balance -= currentChip;
            updateBalanceDisplay();
            updateBetDisplay();
            saveBets();  // 🔥 lưu lại ngay
        }
    });
});

// --- reset cược ---
function resetBets() {
    for (let k in bets) bets[k] = 0;
    updateBetDisplay();
}

// Lấy ngày hiện tại (yyyy-mm-dd)
function getToday() {
    let d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

// Lấy ngày cuối cùng lưu trong localStorage
let lastDate = localStorage.getItem("lastSpinDate");

// Nếu khác ngày → reset về 0
if (lastDate !== getToday()) {
    spinCount = 0;
    localStorage.setItem("spinCount", spinCount);
    localStorage.setItem("lastSpinDate", getToday());
}

// --- Lưu cược vào localStorage ---
function saveBets() {
    localStorage.setItem("currentBets", JSON.stringify(bets));
    localStorage.setItem("totalBet", document.getElementById("totalBetDisplay").textContent);
}

// --- Khôi phục cược khi load lại ---
function restoreBets() {
    const savedBets = JSON.parse(localStorage.getItem("currentBets")) || {};
    bets = savedBets;
    Object.keys(bets).forEach(name => {
        bets[name] = Number(bets[name]); // ép về số
        const bet = document.querySelector(`.bet-box[data-name="${name}"] .bet-amount`);
        if (bet) bet.textContent = bets[name];
    });

    // Tổng cược
    const savedTotal = localStorage.getItem("totalBet");
    if (savedTotal) {
        document.getElementById("totalBetDisplay").textContent = savedTotal;
    }
}

// --- Reset cược sau khi quay ---
function clearBets() {
    bets = {};
    document.querySelectorAll(".bet-amount").forEach(el => el.textContent = "0");
    document.getElementById("totalBetDisplay").textContent = "Tổng cược: 0";
    localStorage.removeItem("currentBets");
    localStorage.removeItem("totalBet");
}

// Gọi restore khi trang vừa load
window.addEventListener("load", restoreBets);
window.addEventListener("load", () => {
    let savedResult = localStorage.getItem("lastResult");
    if (savedResult) {
        let selected = JSON.parse(savedResult);
        document.getElementById("result").innerHTML =
            `${selected.icon}`;
    }
});

function startDoorAnimation(callback) {
    const doors = document.querySelectorAll(".door");
    if (!doors.length) return;
    // Làm tối tất cả
    doors.forEach(d => d.classList.add("dim"));
    let index = 0;
    const interval = setInterval(() => {
        // Tắt sáng
        doors.forEach(d => d.classList.remove("highlight"));
        // Sáng cửa hiện tại
        doors[index].classList.add("highlight");
        index = (index + 1) % doors.length;
    }, 100); // đổi cửa mỗi 0.1s
    // Sau 5 giây thì dừng
    setTimeout(() => {
        clearInterval(interval);
        doors.forEach(d => d.classList.remove("highlight", "dim"));
        if (callback) callback();
    }, 5000);
}

function highlightWinner(name) {
    const doors = document.querySelectorAll(".door");
    doors.forEach(d => d.classList.remove("winner")); // bỏ highlight cũ
    doors.forEach(door => {
        const img = door.querySelector("img");
        if (img && img.alt === name) {   // so sánh theo alt
            door.classList.add("winner");
        }
    });
}