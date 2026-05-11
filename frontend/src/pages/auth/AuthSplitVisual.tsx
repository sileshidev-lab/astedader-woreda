import { useEffect, useState } from "react";

const SLIDE_INTERVAL_MS = 7000;

type AuthSplitVisualProps = {
  photoUrls?: string[];
};

export function AuthSplitVisual({ photoUrls = [] }: AuthSplitVisualProps) {
  const [active, setActive] = useState(0);
  const hasPhotos = photoUrls.length > 0;
  const count = hasPhotos ? photoUrls.length : 2;

  useEffect(() => {
    if (count <= 1) return;

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % count);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [count]);

  if (hasPhotos) {
    return (
      <div className="aw-auth-visual" aria-hidden="true">
        {photoUrls.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className={["aw-auth-visual-slide", active === index ? "is-active" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <img
              src={src}
              alt=""
              className="aw-auth-visual-image"
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="aw-auth-visual" aria-hidden="true">
      <div
        className={["aw-auth-visual-slide aw-auth-visual-gradient-one", active === 0 ? "is-active" : ""]
          .filter(Boolean)
          .join(" ")}
      />
      <div
        className={["aw-auth-visual-slide aw-auth-visual-gradient-two", active === 1 ? "is-active" : ""]
          .filter(Boolean)
          .join(" ")}
      />
    </div>
  );
}
