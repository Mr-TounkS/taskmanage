"use client"

/**
 * NavBar — Topbar mobile uniquement (lg+ → géré par Sidebar)
 * Affiche : hamburger | logo | UserButton
 * La synchronisation checkAndAddUser est gérée dans Sidebar (toujours monté).
 */

import { UserButton } from "@clerk/nextjs";
import { FolderGit2, Menu } from "lucide-react";

interface NavBarProps {
    onOpenSidebar: () => void
}

const NavBar = ({ onOpenSidebar }: NavBarProps) => {
    return (
        // Visible uniquement sur mobile — la sidebar prend le relais sur desktop (lg+)
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-100 shrink-0">
            {/* Hamburger */}
            <button
                onClick={onOpenSidebar}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Open menu"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Logo centré */}
            <div className="flex items-center gap-2">
                <div className="bg-primary text-primary-content rounded-lg p-1">
                    <FolderGit2 className="w-4 h-4" />
                </div>
                <span className="font-bold text-base">
                    Task <span className="text-primary">Manage</span>
                </span>
            </div>

            {/* Avatar utilisateur */}
            <UserButton />
        </div>
    );
}

export default NavBar
