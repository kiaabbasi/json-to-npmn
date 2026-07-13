import React from 'react';

function Card({ icon, title, description, onClick }) {
    return (
        <div
            onClick={onClick}
            className="
                flex items-start gap-3
                w-full
                p-3 mb-2
                bg-white
                border border-gray-200
                rounded-lg
                cursor-pointer
                transition-colors
                hover:border-blue-500
                hover:bg-blue-50
            "
        >
            <div className="text-2xl shrink-0">
                {icon}
            </div>

            <div>
                <div className="mb-1 text-lg font-bold">
                    {title}
                </div>

                <div className="text-gray-500">
                    {description}
                </div>
            </div>
        </div>
    );
}

export default Card;