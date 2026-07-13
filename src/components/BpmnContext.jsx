import { createContext, useContext, useRef } from 'react';

const BpmnContext = createContext(null);

export function BpmnProvider({ children }) {
    const modelerRef = useRef(null);

    return (
        <BpmnContext.Provider value={modelerRef}>
            {children}
        </BpmnContext.Provider>
    );
}

export function useBpmn() {
    return useContext(BpmnContext);
}