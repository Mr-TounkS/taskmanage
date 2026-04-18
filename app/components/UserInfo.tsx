import React, { FC } from "react";
import Image from "next/image";

interface UserInfoProps {
    role: string,
    email: string | null,
    name: string | null,
    imageUrl?: string | null,
}

const UserInfo: FC<UserInfoProps> = ({ role, email, name, imageUrl }) => {
    // Initiales de secours si pas de photo
    const initiales = name
        ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : "?";

    return (
        <div className="flex items-center gap-3 min-w-0 w-full">
            {/* Avatar — taille fixe, ne rétrécit jamais */}
            <div className="avatar shrink-0">
                <div className="w-9 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={name || "avatar"}
                            width={36}
                            height={36}
                            className="rounded-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="bg-primary text-primary-content w-9 h-9 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold">{initiales}</span>
                        </div>
                    )}
                </div>
            </div>
            {/* Texte — min-w-0 requis pour que truncate fonctionne dans un flex */}
            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs text-gray-400">{role}</span>
                <span className="text-sm truncate" title={email || ""}>{email || ""}</span>
                <span className="text-sm italic font-bold truncate">{name || ""}</span>
            </div>
        </div>
    )
}

export default UserInfo
