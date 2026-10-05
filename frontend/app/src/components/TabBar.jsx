import Icon from './Icon';
import { useApp } from '../store';
import { track } from '../lib/track';

const TABS = [
  { key: 'today', label: '今日', icon: 'home' },
  { key: 'calendar', label: '日历', icon: 'calendar' },
  { key: 'mine', label: '我的', icon: 'user' }
];

export default function TabBar({ current, onChange }) {
  const { theme } = useApp();
  return (
    <div className="tabbar" data-theme={theme}>
      {TABS.map((t) => (
        <div
          key={t.key}
          className={'tab-item' + (current === t.key ? ' active' : '')}
          onClick={() => { track('page_view', { page: t.key }); onChange(t.key); }}
        >
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}
