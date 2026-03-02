'use client';

import { useEffect, useState } from 'react';

export default function InAppBrowserGuard({ children }: { children: React.ReactNode }) {
  const [isInApp, setIsInApp] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/KAKAOTALK|Instagram|FBAN|FBAV|LINE|NAVER/i.test(ua)) {
      setIsInApp(true);

      // 안드로이드: 자동으로 Chrome 열기 시도
      if (/Android/i.test(ua)) {
        const currentUrl = window.location.href;
        window.location.href =
          'intent://' +
          currentUrl.replace(/https?:\/\//, '') +
          '#Intent;scheme=https;package=com.android.chrome;end';
        setTimeout(() => setTried(true), 1500);
        return;
      }

      // iOS: Safari 열기 시도
      if (/iPhone|iPad/i.test(ua)) {
        // iOS에서는 자동 리다이렉트가 어려우므로 바로 안내 표시
        setTried(true);
        return;
      }

      setTried(true);
    }
  }, []);

  if (isInApp && tried) {
    const currentUrl = window.location.href;

    const handleCopy = () => {
      navigator.clipboard
        .writeText(currentUrl)
        .then(() => {
          alert('링크가 복사되었습니다!\nChrome 또는 Safari에서 붙여넣기 해주세요.');
        })
        .catch(() => {
          // clipboard 실패 시 fallback
          const input = document.createElement('input');
          input.value = currentUrl;
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          document.body.removeChild(input);
          alert('링크가 복사되었습니다!\nChrome 또는 Safari에서 붙여넣기 해주세요.');
        });
    };

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">🌐</div>
        <h1 className="text-white text-2xl font-bold mb-2">외부 브라우저에서 열어주세요</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          카카오톡 내 브라우저에서는
          <br />
          Google 로그인이 지원되지 않습니다.
        </p>

        <button
          onClick={() => {
            window.location.href =
              'intent://' +
              currentUrl.replace(/https?:\/\//, '') +
              '#Intent;scheme=https;package=com.android.chrome;end';
          }}
          className="w-full max-w-xs py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-lg mb-3 transition"
        >
          🚀 Chrome으로 열기
        </button>

        <button
          onClick={() => {
            window.location.href =
              'intent://' +
              currentUrl.replace(/https?:\/\//, '') +
              '#Intent;scheme=https;package=com.sec.android.app.sbrowser;end';
          }}
          className="w-full max-w-xs py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg mb-3 transition"
        >
          📱 삼성 인터넷으로 열기
        </button>

        <button
          onClick={handleCopy}
          className="w-full max-w-xs py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl font-bold text-lg mb-8 transition"
        >
          📋 링크 복사하기
        </button>

        <div className="bg-gray-800/60 rounded-2xl p-5 max-w-xs w-full">
          <p className="text-gray-300 text-sm font-bold mb-2">직접 여는 방법:</p>
          <p className="text-gray-400 text-xs leading-relaxed">
            우측 상단 <span className="text-white font-bold"> ⋮ </span> 메뉴 →
            <br />
            <span className="text-white font-bold">&quot;다른 브라우저로 열기&quot;</span> 선택
          </p>
        </div>
      </div>
    );
  }

  if (isInApp && !tried) {
    // 리다이렉트 시도 중
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">브라우저로 이동 중...</p>
      </div>
    );
  }

  return <>{children}</>;
}
