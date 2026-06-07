// UIContext —— 替代 wx.showToast / wx.showModal / wx.showLoading
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { setToast } from '../lib/bridge';
import styles from './UIContext.module.scss';

const UICtx = createContext(null);

export function useUI() {
  return useContext(UICtx);
}

let _seq = 0;

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const timers = useRef({});

  // wx.showToast({ title, icon: 'success'|'none'|'loading', duration })
  const showToast = useCallback((opts) => {
    const o = typeof opts === 'string' ? { title: opts } : opts || {};
    const id = ++_seq;
    const duration = o.duration ?? (o.icon === 'loading' ? 100000 : 1500);
    setToasts((list) => [
      ...list,
      { id, title: o.title || '', icon: o.icon || 'none' },
    ]);
    if (duration < 100000) {
      timers.current[id] = setTimeout(() => {
        setToasts((list) => list.filter((t) => t.id !== id));
        delete timers.current[id];
      }, duration);
    }
    return id;
  }, []);

  const hideToast = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    setToasts([]);
  }, []);

  // wx.showModal({ title, content, showCancel, editable, placeholderText })
  //  -> Promise<{ confirm, cancel, content }>
  const showModal = useCallback((opts) => {
    const o = opts || {};
    setInputVal(o.defaultValue || '');
    return new Promise((resolve) => {
      setModal({
        title: o.title ?? '提示',
        content: o.content ?? '',
        showCancel: o.showCancel !== false,
        cancelText: o.cancelText || '取消',
        confirmText: o.confirmText || '确定',
        confirmColor: o.confirmColor,
        editable: !!o.editable,
        placeholderText: o.placeholderText || '',
        resolve,
      });
    });
  }, []);

  const closeModal = useCallback((confirm) => {
    setModal((m) => {
      if (m)
        m.resolve({
          confirm,
          cancel: !confirm,
          content: confirm && m.editable ? inputValRef.current : '',
        });
      return null;
    });
  }, []);

  // 用 ref 取最新输入值，避免闭包旧值
  const inputValRef = useRef('');
  inputValRef.current = inputVal;

  useEffect(() => {
    setToast(showToast);
  }, [showToast]);

  return (
    <UICtx.Provider value={{ showToast, hideToast, showModal }}>
      {children}

      {/* Toast 层 */}
      {toasts.length > 0 && (
        <div className={styles.toastLayer}>
          {toasts.map((t) => (
            <div key={t.id} className={styles.toast}>
              {t.icon === 'success' && <div className={styles.icon}>✓</div>}
              {t.icon === 'loading' && (
                <div className={`${styles.icon} ${styles.spin}`}>◌</div>
              )}
              <div className={styles.toastText}>{t.title}</div>
            </div>
          ))}
        </div>
      )}

      {/* Modal 层 */}
      {modal && (
        <div className={styles.modalMask}>
          <div className={styles.modal}>
            {modal.title ? (
              <div className={styles.modalTitle}>{modal.title}</div>
            ) : null}
            {modal.content ? (
              <div className={styles.modalContent}>{modal.content}</div>
            ) : null}
            {modal.editable && (
              <div className={styles.modalInputWrap}>
                <input
                  className={styles.modalInput}
                  autoFocus
                  value={inputVal}
                  placeholder={modal.placeholderText}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') closeModal(true);
                  }}
                />
              </div>
            )}
            <div className={styles.modalBtns}>
              {modal.showCancel && (
                <button
                  className={`${styles.modalBtn} ${styles.cancel}`}
                  onClick={() => closeModal(false)}
                >
                  {modal.cancelText}
                </button>
              )}
              <button
                className={`${styles.modalBtn} ${styles.confirm}`}
                style={
                  modal.confirmColor ? { color: modal.confirmColor } : undefined
                }
                onClick={() => closeModal(true)}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </UICtx.Provider>
  );
}
