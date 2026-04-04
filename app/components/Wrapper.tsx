type WrapperPops = {
    children: React.ReactNode
}

import React from "react"
import NavBar from "./NavBar"
import { ToastContainer } from "react-toastify"

const Wrapper = ({ children }: WrapperPops) => {
    return (
        <div>
            <NavBar/>
            {/* <main> sémantique requis pour l'accessibilité (landmark ARIA) */}
            {/* Corrige : "Document does not have a main landmark" — Lighthouse Accessibility */}
            <main className="px-5 md:px-[10%] mt-8 mb-10">
                 <ToastContainer
                 position='top-right'
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
    )
}
export default Wrapper