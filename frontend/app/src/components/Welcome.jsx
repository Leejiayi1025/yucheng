import Icon from './Icon';

/** 欢迎页（原型 #scr-welcome） */
export default function Welcome({ onEnter }) {
  return (
    <div className="screen active">
      <div className="welcome-bg"></div>
      <div className="welcome-overlay"></div>
      <div className="welcome-content">
        <div className="welcome-title">
          把想做的事
          <br />
          变成今天的日程
        </div>
        <div className="welcome-sub">一句话，让生活有条不紊</div>
        <button className="welcome-btn" onClick={onEnter}>
          <Icon name="home" size={18} />
          进入语程
        </button>
      </div>
    </div>
  );
}
