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
    document.querySelectorAll('.chip, .bet-box').forEach(el => el.classList.remove('lock-bets'));

    renderHistory();
    updateBalanceDisplay();
    updateJackpotDisplay();
    updateStatsDisplay();
    restoreBets();
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
            lockDoors();   // khóa đặt cược
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
    let chosen = null;

    for (let opt of options) {
        cumWeight += opt.weight;
        if (rand <= cumWeight) {
            chosen = opt;
            break;
        }
    }
    if (chosen) {
        /* const hotText = `🔥 Hot: ${chosen.name} ${chosen.icon}`;*/
        /*
        //  1) Hiển thị ở khu vực suggestion
          document.getElementById("suggestion").textContent = hotText;
        */
        //  2) Lưu lại vào localStorage
        /* localStorage.setItem("lastHot", hotText);*/
        localStorage.setItem("lastHotName", chosen.name);

        // 3) Xóa nhãn cũ trong bet-box & cửa
        document.querySelectorAll(".bet-box .hot-label").forEach(el => el.remove());
        document.querySelectorAll(".door .hot-label").forEach(el => el.remove());


        //Hiển thị ở bet-box
        const box = document.querySelector(`.bet-box[data-name="${chosen.name}"]`);
        if (box) {
            const label = document.createElement("div");
            label.className = "hot-label";
            label.textContent = `🔥 Hot`;
            box.prepend(label);
        }


        //Hiển thị trên ô quay thưởng
        const door = document.querySelector(`.door[data-name="${chosen.name}"]`);
        if (door) {
            const label = document.createElement("div");
            label.className = "hot-label";
            label.textContent = "🔥 Hot";
            door.appendChild(label);
        }
    }
}

//Khi load lại trang, hiển thị lại Hot nếu có
const savedHot = localStorage.getItem("lastHot");
if (savedHot) {
    document.getElementById("suggestion").textContent = savedHot;
}

const savedHotName = localStorage.getItem("lastHotName");
if (savedHotName) {
    // Xóa Hot cũ
    document.querySelectorAll(".bet-box .hot-label").forEach(el => el.remove());
    document.querySelectorAll(".door .hot-label").forEach(el => el.remove());
    // Hiển thị lại ở bet-box
    const betBox = document.querySelector(`.bet-box[data-name="${savedHotName}"]`);
    if (betBox) {
        const label = document.createElement("div");
        label.className = "hot-label";
        label.textContent = "🔥 Hot";
        betBox.prepend(label);
    }
    // Hiển thị lại ở cửa quay thưởng
    const door = document.querySelector(`.door[data-name="${savedHotName}"]`);
    if (door) {
        const label = document.createElement("div");
        label.className = "hot-label";
        label.textContent = "🔥 Hot";
        door.appendChild(label);
    }
}

function updateBalance() {
    document.getElementById("balance").textContent = balance;
}

// Hiển thị giao diện rút xu
document.getElementById("withdrawBtn").onclick = () => {
    document.getElementById("withdrawInfoModal").style.display = "flex";
};

document.getElementById("closeWithdrawModal").onclick = () => {
    document.getElementById("withdrawInfoModal").style.display = "none";
};



// Xử lý rút xu
document.getElementById("sendWithdrawBtn").onclick = () => {
    const name = document.getElementById("userName").value;
    const bank = document.getElementById("bankName").value;
    const account = document.getElementById("userAccount").value;
    const amount = parseInt(document.getElementById("withdrawAmount").value);
    const status = document.getElementById("withdrawStatus");

    if (!name || !bank || !account || !amount || amount <= 0) {
        status.textContent = "⚠️ Vui lòng điền đầy đủ thông tin.";
        status.style.color = "red";
        return;
    }

    if (amount > balance) {
        status.textContent = "⚠️ Số dư không đủ để rút.";
        status.style.color = "red";
        return;
    }

    // Trừ xu ngay khi gửi yêu cầu
    balance -= amount;
    updateBalanceDisplay();

    // Hiện trạng thái chờ xử lý
    status.style.color = "orange";
    status.textContent = "⏳ Gửi yêu cầu thành công, hệ thống đang xử lý...";

    // Thời gian xử lý ngẫu nhiên từ 90s -> 120s
    let wait = Math.floor(Math.random() * (120 - 90 + 1)) + 90; // random 90-120 giây

    const countdown = setInterval(() => {
        wait--;
        status.textContent = `⏳ Hệ thống đang xử lý...`;
        if (wait <= 0) {
            clearInterval(countdown);
            status.textContent = "✅ Rút xu thành công!";
            status.style.color = "lightgreen";
            document.getElementById("notification").textContent = `Rút xu -${amount} thành công, tiền đang được chuyển tới tài khoản.`;

            // Tắt notification sau 10s
            setTimeout(() => {
                document.getElementById("notification").textContent = "";
            }, 10000);


            // Ẩn modal sau 5s
            setTimeout(() => {
                document.getElementById("withdrawInfoModal").style.display = "none";
                status.textContent = "";
            }, 5000);
        }
    }, 1000);
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
    document.getElementById("totalBetDisplay").textContent = `${total}`;
}


function updateJackpotDisplay() {
    const oldVal = parseInt(jackpotEl.textContent.replace(/\D/g, '')) || 0;
    animateNumber(jackpotEl, oldVal, jackpot, 600);
    document.getElementById("jackpotProgress").value = jackpot;
    localStorage.setItem("jackpot", jackpot);
}

function updateBalanceDisplay() {
    const oldVal = parseInt(balanceEl.textContent.replace(/\D/g, '')) || 0;
    animateNumber(balanceEl, oldVal, balance, 600);
    localStorage.setItem("balance", balance);
}

function showNotification(message) {
    notificationEl.textContent = message;
    setTimeout(() => notificationEl.textContent = "", 3000);
}

//Hàm nạp xu.
function confirmDeposit() {
    const amount = parseInt(document.getElementById("amount").value) || 0;
    if (amount <= 0) {
        alert("Vui lòng nhập số xu muốn nạp!");
        return;
    }

    const modal = document.getElementById("depositConfirmModal");
    document.getElementById("depositConfirmText").textContent =
        `Bạn có chắc muốn nạp ${amount} xu không?`;

    // Hiện modal với hiệu ứng fade-in
    modal.style.display = "flex";
    modal.classList.remove("hide");
    modal.classList.add("show");

    // Nút Hủy
    document.getElementById("depositNo").onclick = () => {
        modal.classList.remove("show");
        modal.classList.add("hide");
        setTimeout(() => { modal.style.display = "none"; }, 300); // đợi animation xong
    };

    // Nút Xác nhận
    document.getElementById("depositYes").onclick = () => {
        modal.classList.remove("show");
        modal.classList.add("hide");
        setTimeout(() => { modal.style.display = "none"; }, 300);
        startDepositProcess(amount);
    };
}

// Hàm xử lý nạp xu sau khi xác nhận
function startDepositProcess(amount) {
    const code = "NAP" + Math.floor(100000 + Math.random() * 900000);
    const modal = document.getElementById("depositInfoModal");
    const status = document.getElementById("depositStatus");

    // Hiện modal thông tin nạp
    document.getElementById("depositCode").textContent = code;
    modal.style.display = "flex";
    status.style.color = "orange";
    status.innerHTML = `<br><span id="codeExpiry"></span>`;

    // Đếm ngược thời gian hết hạn (30 phút)
    let expiryTime = 10 * 60; // 10 phút
    clearInterval(window.expiryTimer); // nếu trước đó còn chạy thì hủy
    window.expiryTimer = setInterval(() => {
        expiryTime--;
        if (expiryTime > 0) {
            const minutes = Math.floor(expiryTime / 60);
            const seconds = expiryTime % 60;
            document.getElementById("codeExpiry").textContent =
                `Mã hết hạn sau ${minutes}:${seconds.toString().padStart(2, "0")}`;
        } else {
            clearInterval(window.expiryTimer);
            document.getElementById("codeExpiry").textContent = "❌ Mã đã hết hạn!";
            document.getElementById("codeExpiry").style.color = "red";
        }
    }, 1000);
    // Thời gian xử lý nạp (ngẫu nhiên 60–90 giây)
    let wait = Math.floor(Math.random() * (60 - 30 + 1)) + 60;
    clearInterval(window.processTimer); // hủy nếu có timer cũ
    window.processTimer = setInterval(() => {
        wait--;
        if (wait > 0) {
            status.innerHTML = `
 <span id="codeExpiry">Code hết hạn sau: ${Math.floor(expiryTime / 60)}:${(expiryTime % 60).toString().padStart(2, "0")}</span>
 `;
        } else {
            clearInterval(window.processTimer);
            deposit(amount);
            status.innerHTML = `✅ Nạp thành công ${amount} xu vào tài khoản!<br>
 `;
            status.style.color = "lightgreen";
            document.getElementById("notification").textContent = `Nạp thành công +${amount} xu.`;
            setTimeout(() => {
                document.getElementById("notification").textContent = "";
            }, 10000);
            // Modal fade-out sau 5s
            setTimeout(() => {
                modal.classList.remove("show");
                modal.classList.add("hide");
                setTimeout(() => { modal.style.display = "none"; }, 300);
            }, 5000);
        }
    }, 1000);
    document.getElementById("closeDepositModal").onclick = () => {
        modal.classList.remove("show");
        modal.classList.add("hide");
        setTimeout(() => { modal.style.display = "none"; }, 300);
        clearInterval(window.expiryTimer);
        clearInterval(window.processTimer);
    };
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
    historyEl.innerHTML = "🌡 <b>Result</b><br>";
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
    const data = historyEl.innerHTML.replace(' <b>Result</b><br>', '');
    localStorage.setItem("historyData", data);
}

// Khôi phục lịch sử khi F5
function loadHistory() {
    const saved = localStorage.getItem("historyData");
    if (saved) {
        historyEl.innerHTML = ' <b>Result</b><br>' + saved;
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
    historyEl.innerHTML = " <b>Result</b><br>";
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
    // cũng load lại số dư đã lưu
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
    }, 5000);
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
            showResultModal(selected, totalBet, winAmount);
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
            if (totalBet >= 0) {
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
                    setTimeout(() => {
                        betBox.classList.remove('highlight-win');
                        unlockBets();
                        document.querySelectorAll('.chip, .bet-box').forEach(chip => chip.classList.remove('lock-bets'));
                        //Tăng số phiên quay.
                        spinCount++;
                        document.getElementById("spinCounter").textContent = `🎯 Round: ${spinCount}`;
                        updateSpinCounter();
                        //Reset cược.
                        resetBets();
                        unlockDoors();
                        isSpinning = false;
                        clearBets(); // 🔥 sang vòng mới thì không giữ cược nữa
                        clearHot();  // 🔥 Xóa HOT sau 5 giây khi đã trả kết quả
                    }, 5000);
                    highlightWinner(selected.name);
                }, 0); // bất sáng ô trúng và tắt ô trượt
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
    spinCounterEl.textContent = `🎯 Round: ${spinNumber}`;
    /*document.getElementById("spinCounter").textContent = `🎯 Round: ${spinCount}`;
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
    const profitEl = document.querySelector(".stat-value.profit");
    const lossEl = document.querySelector(".stat-value.loss");

    const oldProfit = parseInt(profitEl.textContent.replace(/\D/g, '')) || 0;
    const oldLoss = parseInt(lossEl.textContent.replace(/\D/g, '')) || 0;

    animateNumber(profitEl, oldProfit, netProfit, 600);
    animateNumber(lossEl, oldLoss, netLoss, 600);

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

document.querySelectorAll(".door").forEach(door => {
    door.addEventListener("click", () => {
        if (!currentChip) {
            alert("Hãy chọn mệnh giá chip trước!");
            return;
        }
        if (balance < currentChip) {
            alert("Không đủ số dư để đặt cược!");
            return;
        }
        const name = door.dataset.name;
        if (!bets[name]) bets[name] = 0;
        bets[name] += currentChip;
        const betDisplay = door.querySelector(".bet-display");
        betDisplay.textContent = bets[name];
        localStorage.setItem("currentBets", JSON.stringify(bets));
        balance -= currentChip;
        updateBalanceDisplay();
    });
});


// --- reset cược ---
function resetBets() {
    bets = {}; // reset object lưu cược
    document.querySelectorAll(".door .bet-display").forEach(el => {
        el.textContent = "0"; // reset hiển thị về 0
    });
    localStorage.removeItem("currentBets"); // nếu bạn có lưu vào localStorage
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

        document.querySelectorAll(".door").forEach(door => {
            const name = door.dataset.name;
            const betDisplay = door.querySelector(".bet-display");
            betDisplay.textContent = bets[name] || 0;
        });
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
    document.getElementById("totalBetDisplay").textContent = "";
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


function highlightWinner(winnerName) {
    const doors = document.querySelectorAll(".door");
    doors.forEach(d => d.classList.remove("winner"));
    doors.forEach(door => {
        const img = door.querySelector("img");
        if (img && img.alt === winnerName) {   // so sánh theo alt
            door.classList.add("winner");
        }
        door.classList.add("dim"); // làm mờ tất cả
        if (door.dataset.name === winnerName) {
            door.classList.remove("dim"); // bỏ mờ ô trúng
            door.classList.add("highlight"); // sáng ô trúng
        } else {
            door.classList.remove("highlight");
        }
    });
    // Sau 5s reset lại bình thường
    setTimeout(() => {
        doors.forEach(door => {
            door.classList.remove("dim", "highlight");
            door.classList.remove("winner");
        });
    }, 5000);
}



function unlockBets() {
    document.querySelectorAll('.chip, .bet-box').forEach(el => {
        el.classList.remove('lock-bets');
    });
    isSpinning = false;
}

window.addEventListener("load", () => {
    // Mở khóa chip + bet box khi F5
    document.querySelectorAll('.chip, .bet-box').forEach(el => {
        el.classList.remove('lock-bets');
    });
});


function clearHot() {
    // Xóa nhãn trong bet-box & cửa
    document.querySelectorAll(".bet-box .hot-label").forEach(el => el.remove());
    document.querySelectorAll(".door .hot-label").forEach(el => el.remove());
    // Xóa text ở khu vực suggestion
    document.getElementById("suggestion").textContent = "";
    // Xóa trong localStorage để lần sau suggestResult() sẽ tạo mới
    localStorage.removeItem("lastHot");
    localStorage.removeItem("lastHotName");
}

function showResultModal(selected, totalBet, winAmount) {
    const modal = document.getElementById("resultModal");
    document.body.style.overflow = "hidden";   // khoá cuộn

    const spinNumber = getCurrentSpinNumber();
    document.getElementById("modalSpin").textContent = spinNumber;

    document.getElementById("modalResult").textContent = selected.icon;
    document.getElementById("modalWinner").textContent = `${selected.name}`;
    document.getElementById("modalBet").textContent = totalBet;
    document.getElementById("modalWin").textContent = winAmount;

    modal.classList.remove("hide");
    modal.style.display = "flex";

    // dùng setTimeout để đảm bảo transition chạy
    setTimeout(() => {
        modal.classList.add("show");
    }, 10);

    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        closeResultModal();
    }, 5000);
}

function closeResultModal() {
    const modal = document.getElementById("resultModal");
    document.body.style.overflow = "";
    modal.classList.remove("show");
    modal.classList.add("hide");

    // Chờ animation xong mới ẩn hẳn
    setTimeout(() => {
        modal.style.display = "none";
        modal.classList.remove("hide");
    }, 400);
}

// ESC để đóng modal
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        const modal = document.getElementById("resultModal");
        if (modal && modal.style.display !== "none") {
            closeResultModal();
        }
    }
});

// Click ra ngoài modal-box để đóng
document.getElementById("resultModal").addEventListener("click", function (e) {
    if (e.target === this) {  // chỉ khi click đúng nền đen bên ngoài
        closeResultModal();
    }
});

function animateNumber(element, start, end, duration = 500) {
    let startTime = null;
    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value.toLocaleString("vi-VN") + " ";
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
    // Hiệu ứng flash
    element.classList.add("flash-update");
    setTimeout(() => element.classList.remove("flash-update"), 600);
}

function lockDoors() {
    document.querySelectorAll(".door").forEach(door => door.classList.add("locked"));
}

function unlockDoors() {
    document.querySelectorAll(".door").forEach(door => door.classList.remove("locked"));
}
