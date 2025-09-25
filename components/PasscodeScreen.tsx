import React, { useState, useEffect } from 'react';

const CORRECT_PASSCODE = '1234';

interface PasscodeScreenProps {
    onLoginSuccess: () => void;
}

const PasscodeScreen: React.FC<PasscodeScreenProps> = ({ onLoginSuccess }) => {
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (passcode.length === 4) {
            if (passcode === CORRECT_PASSCODE) {
                onLoginSuccess();
            } else {
                setError('Incorrect Passcode');
                setTimeout(() => {
                    setError('');
                    setPasscode('');
                }, 1000);
            }
        }
    }, [passcode, onLoginSuccess]);

    const handleKeyPress = (key: string) => {
        if (error) return;
        if (key === 'del') {
            setPasscode(p => p.slice(0, -1));
        } else if (passcode.length < 4) {
            setPasscode(p => p + key);
        }
    };

    const Key: React.FC<{ value: string; onClick: (val: string) => void; children?: React.ReactNode }> = ({ value, onClick, children }) => (
        <button
            onClick={() => onClick(value)}
            className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700/50 flex items-center justify-center text-3xl font-light text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-300 dark:hover:bg-gray-700"
        >
            {children || value}
        </button>
    );

    return (
        <div className="h-screen w-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-2xl font-semibold text-primary-600 mb-2">RC Tex</h1>
            <h2 className="text-xl text-gray-700 dark:text-gray-300 mb-6">Enter Passcode</h2>
            
            <div className="flex space-x-4 mb-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full border-2 ${error ? 'border-red-500' : 'border-primary-500'} transition-colors ${passcode.length > i ? (error ? 'bg-red-500' : 'bg-primary-500') : 'bg-transparent'}`}></div>
                ))}
            </div>

            <p className="h-6 text-red-500 mb-4">{error}</p>

            <div className="grid grid-cols-3 gap-6">
                <Key value="1" onClick={handleKeyPress} />
                <Key value="2" onClick={handleKeyPress} />
                <Key value="3" onClick={handleKeyPress} />
                <Key value="4" onClick={handleKeyPress} />
                <Key value="5" onClick={handleKeyPress} />
                <Key value="6" onClick={handleKeyPress} />
                <Key value="7" onClick={handleKeyPress} />
                <Key value="8" onClick={handleKeyPress} />
                <Key value="9" onClick={handleKeyPress} />
                <div />
                <Key value="0" onClick={handleKeyPress} />
                <Key value="del" onClick={handleKeyPress}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 12M3 12l6.414-6.414a2 2 0 012.828 0L21 12"></path></svg>
                </Key>
            </div>
        </div>
    );
};

export default PasscodeScreen;
