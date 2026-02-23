import { MainLayout } from './components/layout/MainLayout';
import './App.css';

/**
 * App - 应用根组件
 * 
 * 使用 MainLayout 作为主布局
 */
function App() {
  return (
    <div className="h-screen w-full">
      <MainLayout />
    </div>
  );
}

export default App;
