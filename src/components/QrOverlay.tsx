import { useEffect } from "react";

type QrOverlayProps = {
    onClose: () => void;
};

const QrOverlay = ({ onClose }: QrOverlayProps) => {
    // Close on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [onClose]);

    return (
        <div className="qr-overlay" role="dialog" aria-modal="true" aria-label="QR code">
            <div className="qr-overlay-backdrop" onClick={onClose} />
            <div className="qr-overlay-content">
                <button className="qr-overlay-close" onClick={onClose} aria-label="Fermer">
                    ✕
                </button>
                <img
                    src="/contact/qr-alabrestoise.png"
                    alt="QR code À la Brestoise"
                    className="qr-overlay-img"
                />
            </div>
        </div>
    );
};

export default QrOverlay;
