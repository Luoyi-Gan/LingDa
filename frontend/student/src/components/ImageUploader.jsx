import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { api, mediaUrl } from '../lib/api';
import { useUI } from '../context/UIContext';
import { cn } from '../lib/cn';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export default function ImageUploader({ value = [], onChange, max = 9, disabled = false, onUploadingChange }) {
  const inputRef = useRef(null);
  const { showToast } = useUI();
  const [uploading, setUploading] = useState(false);

  const chooseFiles = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length) return;

    const slots = max - value.length;
    if (slots <= 0) {
      showToast({ title: `最多上传 ${max} 张图片`, icon: 'none' });
      return;
    }
    if (selected.length > slots) {
      showToast({ title: `还可以选择 ${slots} 张图片`, icon: 'none' });
      return;
    }
    const invalidType = selected.find((file) => !ACCEPTED_TYPES.includes(file.type));
    if (invalidType) {
      showToast({ title: '仅支持 JPG、PNG、WebP 或 GIF 图片', icon: 'none' });
      return;
    }
    const oversized = selected.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      showToast({ title: '单张图片不能超过 8MB', icon: 'none' });
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    try {
      const result = await api.uploads.images(selected);
      const paths = (result.files || []).map((file) => file.path).filter(Boolean);
      onChange([...value, ...paths]);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const single = max === 1;
  return (
    <div>
      <div className={cn('grid gap-2', single ? 'grid-cols-1' : 'grid-cols-3 sm:grid-cols-5')}>
        {value.map((path) => (
          <div key={path} className={cn('group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50', single ? 'aspect-[16/7]' : 'aspect-square')}>
            <img src={mediaUrl(path)} alt="已上传图片" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== path))}
              disabled={disabled || uploading}
              aria-label="移除图片"
              title="移除图片"
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950/70 text-white opacity-100 backdrop-blur-sm transition hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className={cn(
              'flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60',
              single && 'aspect-[16/7] w-full',
            )}
          >
            {uploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-xs font-semibold">{uploading ? '正在上传' : single ? '选择封面图片' : '添加图片'}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={!single}
        className="hidden"
        onChange={chooseFiles}
      />
      <p className="mt-2 text-xs font-normal text-slate-400">
        支持 JPG、PNG、WebP、GIF，单张不超过 8MB{!single && `，最多 ${max} 张`}。
      </p>
    </div>
  );
}
