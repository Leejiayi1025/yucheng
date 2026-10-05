import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useApp } from '../store';
import AvatarCropper from './AvatarCropper';
import { updateProfile } from '../lib/api';

/* 内置头像（与原型一致，描边风格，颜色由容器决定） */
export const AVATARS = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  star: '<path d="M12 3.6l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 10l6-.9z"/>',
  moon: '<path d="M20.4 14.8A8.6 8.6 0 1 1 9.2 3.6a6.9 6.9 0 0 0 11.2 11.2z"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2v5l3 1.8"/>',
  heart: '<path d="M12 20.4S3.6 15 3.6 9.5A4.9 4.9 0 0 1 12 6.4a4.9 4.9 0 0 1 8.4 3.1c0 5.5-8.4 10.9-8.4 10.9z"/>'
};

export function AvatarInner({ profile }) {
  if (profile && profile.img) return <img src={profile.img} alt="头像" />;
  const key = (profile && profile.av) || 'user';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: AVATARS[key] || AVATARS.user }}
    />
  );
}

/* 等比缩放并居中裁成 200×200 JPEG —— 避免 base64 撑爆 localStorage（原型做法） */
function resizeToDataURL(file, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const S = 200;
      const cv = document.createElement('canvas');
      cv.width = S;
      cv.height = S;
      const ctx = cv.getContext('2d');
      const scale = Math.max(S / img.width, S / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      cb(cv.toDataURL('image/jpeg', 0.82));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

export default function ProfileSheet({ onClose }) {
  const { profile, setProfile, toast } = useApp();
  const [draft, setDraft] = useState({ av: profile.av || 'user', img: profile.img || '', nick: profile.nick || '', sign: profile.sign || '' });
  const fileRef = useRef(null);
  const [croppingFile, setCroppingFile] = useState(null);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const save = async () => {
    // 先存本地
    setProfile(draft);
    // 再存后端
    const r = await updateProfile({
      nickname: draft.nick,
      sign: draft.sign,
      avatar: draft.img || null
    });
    if (r.ok) {
      toast('已保存');
    } else {
      toast(r.msg || '保存失败');
    }
    onClose();
  };

  return (
    <div className="edit-sheet show" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-card">
        <div className="es-nav">
          <button className="es-nav-btn" onClick={onClose}>
            取消
          </button>
          <div className="es-nav-title">个人信息</div>
          <button className="es-nav-btn primary" onClick={save}>
            保存
          </button>
        </div>

        <div className="es-body">
          <div className="es-block es-pf-block">
            <div className="mine-avatar">
              <AvatarInner profile={draft} />
            </div>
            <div className="pf-label">选择头像 · 或点第一个上传图片</div>
            <div className="pf-avatars">
              <button
                className="pf-av pf-upload"
                onClick={() => fileRef.current && fileRef.current.click()}
                aria-label="上传图片"
              >
                <Icon name="upload" size={20} stroke />
              </button>
              {Object.keys(AVATARS).map((k) => (
                <button
                  key={k}
                  className={'pf-av' + (!draft.img && draft.av === k ? ' on' : '')}
                  onClick={() => setDraft((d) => ({ ...d, av: k, img: '' }))}
                  aria-label={'头像' + k}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dangerouslySetInnerHTML={{ __html: AVATARS[k] }}
                  />
                </button>
              ))}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) setCroppingFile(f);
                e.target.value = '';
              }}
            />
          </div>

          <div className="es-block">
            <div className="es-row">
              <span className="es-label">昵称</span>
              <input
                className="es-input"
                type="text"
                maxLength={12}
                placeholder="给自己起个名字"
                value={draft.nick}
                onChange={(e) => setDraft((d) => ({ ...d, nick: e.target.value }))}
              />
            </div>
            <div className="es-row">
              <span className="es-label">个性签名</span>
              <input
                className="es-input"
                type="text"
                maxLength={20}
                placeholder="一句话介绍自己"
                value={draft.sign}
                onChange={(e) => setDraft((d) => ({ ...d, sign: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 头像裁剪弹窗 */}
      {croppingFile && (
        <AvatarCropper
          file={croppingFile}
          onCancel={() => setCroppingFile(null)}
          onConfirm={(url) => {
            setDraft((d) => ({ ...d, img: url, av: '' }));
            setCroppingFile(null);
          }}
        />
      )}
    </div>
  );
}
