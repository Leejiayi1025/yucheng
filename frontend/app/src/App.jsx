import { useState, lazy, Suspense } from 'react';
import Login from './pages/Login';
import Today from './pages/Today';
import NotifBanner from './components/NotifBanner';
import Onboarding from './components/Onboarding';
import { useApp } from './store';

// 懒加载其他页面，首屏只加载首页
const Calendar = lazy(() => import('./pages/Calendar'));
const Mine = lazy(() => import('./pages/Mine'));

export default function App() {
  const { user, toastData, closeToast } = useApp();
  const [page, setPage] = useState('today');
  const [entered, setEntered] = useState(() => {
    try {
      return sessionStorage.getItem('yc_entered') === '1';
    } catch {
      return true;
    }
  });

  const toastNode = toastData && (
    <div className="toast show" key={toastData.key}>
      <span>{toastData.msg}</span>
      {toastData.actLabel && (
        <b
          className="toast-act"
          onClick={(e) => {
            e.stopPropagation();
            closeToast();
            toastData.actFn && toastData.actFn();
          }}
        >
          {toastData.actLabel}
        </b>
      )}
    </div>
  );

  /* 首次使用的引导页（同一会话只出现一次）；每一页都会跟随当前主题 */
  if (!entered) {
    return (
      <div className="app">
        <Onboarding
          onEnter={() => {
            try {
              sessionStorage.setItem('yc_entered', '1');
            } catch {
              /* ignore */
            }
            setEntered(true);
          }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <Login />
        {toastNode}
      </div>
    );
  }

  return (
    <div className="app">
      {page === 'today' && <Today page={page} onPage={setPage} />}
      <Suspense fallback={<div style={{padding: 20, textAlign: 'center', color: '#999'}}>加载中...</div>}>
        {page === 'calendar' && <Calendar page={page} onPage={setPage} />}
        {page === 'mine' && <Mine page={page} onPage={setPage} />}
      </Suspense>
      <NotifBanner />
      {toastNode}
    </div>
  );
}
