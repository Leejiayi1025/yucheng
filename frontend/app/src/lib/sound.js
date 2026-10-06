// 真实机械键盘按动声，Web Audio生成，不需要外部文件
let audioCtx = null;

export function playKeySound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // 浏览器自动播放策略：如果AudioContext被挂起，先唤醒
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // 模拟机械键盘按下的"嗒"声，低频150Hz起，快速衰减
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.06);
    
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); // 音量调大
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.08);
  } catch (e) {
    // 不支持就静默失败
  }
}

// 闹钟铃声：播放用户上传的mp3
let alarmAudio = null;
export function playAlarmRing() {
  try {
    if (!alarmAudio) {
      alarmAudio = new Audio('/alarm.mp3');
      alarmAudio.volume = 0.6;
    }
    alarmAudio.currentTime = 0;
    alarmAudio.play();
  } catch (e) {}
}
// 立刻停闹钟铃声
export function stopAlarmRing() {
  try {
    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    }
  } catch (e) {}
}

// 翻书声：切换主题的时候触发，真实mp3翻书声
let pageFlipAudio = null;
export function playPageFlip() {
  try {
    if (!pageFlipAudio) {
      pageFlipAudio = new Audio('/pageflip.mp3');
      pageFlipAudio.volume = 0.4;
    }
    pageFlipAudio.currentTime = 0;
    pageFlipAudio.play();
  } catch (e) {}
}
