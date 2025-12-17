
import React, { useState } from 'react';
import { Calculator as CalcIcon } from 'lucide-react';

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [formula, setFormula] = useState('');

  const handleDigit = (digit: string) => {
    if (display === '0') setDisplay(digit);
    else setDisplay(display + digit);
  };

  const handleOperator = (op: string) => {
    setFormula(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setFormula('');
  };

  const handleCalculate = () => {
    try {
      const fullExpression = formula + display;
      // Using simple eval for the calculator logic safely as input is controlled digits/ops
      // eslint-disable-next-line no-eval
      const result = eval(fullExpression.replace('x', '*').replace('÷', '/'));
      // Arredondar para evitar dízimas gigantes no display
      const formattedResult = Number.isInteger(result) ? String(result) : parseFloat(result.toFixed(8)).toString();
      setDisplay(formattedResult);
      setFormula('');
    } catch {
      setDisplay('Erro');
    }
  };

  const handleBackspace = () => {
    if (display.length > 1) setDisplay(display.slice(0, -1));
    else setDisplay('0');
  };

  const Button = ({ label, onClick, className }: { label: string, onClick: () => void, className?: string }) => (
    <button
      onClick={onClick}
      className={`h-12 sm:h-14 md:h-16 flex items-center justify-center rounded-xl sm:rounded-2xl text-lg sm:text-xl font-bold transition-all active:scale-95 ${className || 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-xs sm:max-w-md mx-auto animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="flex items-center space-x-3 mb-4 sm:mb-6">
          <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
            <CalcIcon size={18} className="text-blue-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-800">Calculadora</h2>
        </div>

        {/* Display Area */}
        <div className="bg-slate-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-4 sm:mb-6 text-right h-24 sm:h-28 md:h-32 flex flex-col justify-end border border-slate-100">
          <p className="text-slate-400 text-xs sm:text-sm font-medium h-5 overflow-hidden">{formula}</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 overflow-hidden truncate">{display}</p>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <Button label="AC" onClick={handleClear} className="bg-rose-50 text-rose-600 hover:bg-rose-100" />
          <Button label="⌫" onClick={handleBackspace} className="bg-slate-100 text-slate-600" />
          <Button label="%" onClick={() => setDisplay(String(parseFloat(display) / 100))} />
          <Button label="÷" onClick={() => handleOperator('÷')} className="bg-blue-600 text-white" />

          <Button label="7" onClick={() => handleDigit('7')} />
          <Button label="8" onClick={() => handleDigit('8')} />
          <Button label="9" onClick={() => handleDigit('9')} />
          <Button label="x" onClick={() => handleOperator('x')} className="bg-blue-600 text-white" />

          <Button label="4" onClick={() => handleDigit('4')} />
          <Button label="5" onClick={() => handleDigit('5')} />
          <Button label="6" onClick={() => handleDigit('6')} />
          <Button label="-" onClick={() => handleOperator('-')} className="bg-blue-600 text-white" />

          <Button label="1" onClick={() => handleDigit('1')} />
          <Button label="2" onClick={() => handleDigit('2')} />
          <Button label="3" onClick={() => handleDigit('3')} />
          <Button label="+" onClick={() => handleOperator('+')} className="bg-blue-600 text-white" />

          <Button label="0" onClick={() => handleDigit('0')} className="col-span-2" />
          <Button label="." onClick={() => handleDigit('.')} />
          <Button label="=" onClick={handleCalculate} className="bg-blue-600 text-white shadow-lg shadow-blue-200" />
        </div>
        
        <p className="text-center text-[10px] sm:text-xs text-slate-400 mt-4 sm:mt-6 font-medium">Use para cálculos rápidos de vendas.</p>
      </div>
    </div>
  );
};

export default Calculator;
