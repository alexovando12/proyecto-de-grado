import React from "react";

const Modal = ({ open, title, onClose, children, footer, className = "" }) => {
	if (!open) return null;

	return (
		<div
			className="modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget && typeof onClose === "function") {
					onClose();
				}
			}}
		>
			<div className={`modal-content modal-lg ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
				<div className="pedido-modal-header">
					{title ? <h2>{title}</h2> : <span />}
					<button type="button" className="btn btn-secondary btn-sm pedido-modal-close" onClick={onClose}>
						Cerrar
					</button>
				</div>
				{children}
				{footer ? <div className="pedido-form-actions">{footer}</div> : null}
			</div>
		</div>
	);
};

export default Modal;
