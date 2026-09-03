import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, BookOpen } from 'lucide-react';
// @ts-ignore -- pas de types officiels à jour publiés pour cette version
import HTMLFlipBook from 'react-pageflip';

const PAGE_COUNT = 14;
const pages = Array.from({ length: PAGE_COUNT }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return `/guide/page-${n}.jpg`;
});

export function GuidePage() {
  const [currentPage, setCurrentPage] = useState(0);
  const bookRef = useRef<any>(null);

  const goPrev = () => bookRef.current?.pageFlip()?.flipPrev();
  const goNext = () => bookRef.current?.pageFlip()?.flipNext();

  return (
    <div className="flex-1 overflow-auto p-3 sm:p-6 animate-fade-in bg-slate-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary-600" />
            <div>
              <h1 className="font-display text-xl font-semibold">Guide d'utilisation</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Page {currentPage + 1} / {PAGE_COUNT}
              </p>
            </div>
          </div>
          <a
            href="/guide-utilisation.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-sm"
          >
            <Download size={15} /> Télécharger en PDF
          </a>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <button
            onClick={goPrev}
            disabled={currentPage === 0}
            aria-label="Page précédente"
            className="btn-ghost !p-2 disabled:opacity-30 flex-shrink-0"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex-1 flex justify-center overflow-hidden">
            {/* @ts-ignore props fournies dynamiquement par react-pageflip */}
            <HTMLFlipBook
              ref={bookRef}
              width={420}
              height={594}
              size="stretch"
              minWidth={220}
              maxWidth={640}
              minHeight={311}
              maxHeight={905}
              maxShadowOpacity={0.4}
              showCover={true}
              usePortrait={true}
              mobileScrollSupport={true}
              drawShadow={true}
              flippingTime={500}
              startZIndex={10}
              autoSize={true}
              startPage={0}
              swipeDistance={30}
              clickEventForward={true}
              useMouseEvents={true}
              showPageCorners={true}
              disableFlipByClick={false}
              className="guide-flipbook shadow-2xl"
              style={{}}
              onFlip={(e: any) => setCurrentPage(e.data)}
            >
              {pages.map((src, i) => (
                <div key={src} className="bg-white overflow-hidden">
                  <img
                    src={src}
                    alt={`Page ${i + 1} du guide d'utilisation`}
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                  />
                </div>
              ))}
            </HTMLFlipBook>
          </div>

          <button
            onClick={goNext}
            disabled={currentPage >= PAGE_COUNT - 1}
            aria-label="Page suivante"
            className="btn-ghost !p-2 disabled:opacity-30 flex-shrink-0"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Cliquez sur un coin de page ou utilisez les flèches pour tourner les pages.
        </p>
      </div>
    </div>
  );
}
