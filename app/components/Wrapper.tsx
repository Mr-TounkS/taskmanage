"use client"

/**
 * Wrapper — Shell principal de l'application
 * Client Component : gère l'état d'ouverture du sidebar mobile
 * Les children (Server ou Client Components) sont passés en props → OK en App Router
 */

import React, { useState } from "react"
import Sidebar from "./Sidebar"
import NavBar from "./NavBar"
import { ToastContainer } from "react-toastify"

type WrapperProps = {
    children: React.ReactNode
}

const Wrapper = ({ children }: WrapperProps) => {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-base-100">

            {/* Overlay sombre — ferme le sidebar en tapant à côté (mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar : drawer sur mobile, fixe sur desktop */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Zone principale */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar mobile */}
                <NavBar onOpenSidebar={() => setSidebarOpen(true)} />

                {/* Contenu scrollable */}
                <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-6">
                    <ToastContainer
                        position="top-right"
                        autoClose={5000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick
                        pauseOnHover
                        draggable
                    />
                    {children}
                </main>
            </div>
        </div>
    )
}

export default Wrapper
