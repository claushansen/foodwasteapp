import React, { useState, useCallback, useRef, useEffect } from 'react';
import { identifyIngredients, generateRecipes } from './services/geminiService';
import type { Recipe } from './types';
import Spinner from './components/Spinner';
import RecipeCard from './components/RecipeCard';

type View = 'start' | 'camera' | 'preview' | 'loading' | 'results';

const App: React.FC = () => {
  const [view, setView] = useState<View>('start');
  const [image, setImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Kunne ikke tilgå kameraet. Tjek venligst dine tilladelser og prøv igen.");
        setView('start');
      }
    };

    if (view === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [view, stopCamera]);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setImageMimeType(file.type);
        setView('preview');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        setImageMimeType('image/jpeg');
        setView('preview');
      }
    }
  };
  
  const startProcessing = useCallback(async () => {
    if (!image || !imageMimeType) return;
    
    setView('loading');
    setError(null);
    setIngredients([]);
    setRecipes([]);

    const base64Data = image.split(',')[1];

    try {
      setProgressMessage('Identificerer ingredienser...');
      const identified = await identifyIngredients(base64Data, imageMimeType);
      
      if (identified.length === 0) {
        setError("Ingen genkendelige ingredienser fundet. Prøv et andet billede.");
        setView('results');
        return;
      }
      setIngredients(identified);
      
      setProgressMessage('Genererer opskrifter...');
      const generated = await generateRecipes(identified);
      setRecipes(generated);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'En ukendt fejl opstod.');
    } finally {
      setView('results');
      setProgressMessage('');
    }
  }, [image, imageMimeType]);

  const handleRegenerateRecipes = async () => {
    if (ingredients.length === 0) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const generated = await generateRecipes(ingredients);
      setRecipes(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke generere nye opskrifter.');
    } finally {
      setIsRegenerating(false);
    }
  };
  
  const triggerFileSelect = () => fileInputRef.current?.click();

  const resetState = () => {
    setImage(null);
    setImageMimeType(null);
    setIngredients([]);
    setRecipes([]);
    setError(null);
    setProgressMessage('');
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    setView('start');
  }

  const renderContent = () => {
    switch (view) {
      case 'start':
        return (
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Stop madspild, start eventyret!</h2>
            <p className="text-lg text-slate-600 mb-8">
              Har du et fyldt køleskab men ingen idéer? Vælg hvordan du vil vise os dine ingredienser.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => setView('camera')}
                className="bg-emerald-600 text-white font-bold py-3 px-8 rounded-full hover:bg-emerald-700 transition-colors duration-300 text-lg shadow-lg flex items-center justify-center"
              >
                <i className="fa-solid fa-camera mr-3"></i>
                Tag billede med kamera
              </button>
              <button
                onClick={triggerFileSelect}
                className="bg-sky-600 text-white font-bold py-3 px-8 rounded-full hover:bg-sky-700 transition-colors duration-300 text-lg shadow-lg flex items-center justify-center"
              >
                 <i className="fa-solid fa-upload mr-3"></i>
                Upload billede
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden"/>
            {error && (
              <div className="text-center mt-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
          </div>
        );
      case 'camera':
        return (
          <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
             <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
              <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
            <div className="flex items-center gap-4 mt-6">
                <button onClick={() => setView('start')} className="bg-slate-200 text-slate-800 font-bold py-3 px-6 rounded-full hover:bg-slate-300 transition-colors">Annuller</button>
                <button onClick={handleCapture} className="bg-emerald-600 text-white font-bold p-4 rounded-full hover:bg-emerald-700 transition-colors shadow-lg h-20 w-20 flex items-center justify-center text-3xl">
                    <i className="fa-solid fa-camera"></i>
                </button>
            </div>
          </div>
        );
      case 'preview':
        return (
            <div className="flex flex-col items-center text-center">
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">Er du klar til at lave mad?</h2>
                <div className="max-w-2xl mx-auto rounded-xl overflow-hidden shadow-2xl mb-6">
                    <img src={image!} alt="Forhåndsvisning af køleskab" className="w-full h-auto object-cover"/>
                </div>
                 <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button onClick={resetState} className="bg-slate-200 text-slate-800 font-bold py-3 px-8 rounded-full hover:bg-slate-300 transition-colors text-lg">
                        <i className="fa-solid fa-arrow-left mr-3"></i>
                        Prøv igen
                    </button>
                    <button onClick={startProcessing} className="bg-emerald-600 text-white font-bold py-3 px-8 rounded-full hover:bg-emerald-700 transition-colors duration-300 text-lg shadow-lg">
                        Brug dette billede
                        <i className="fa-solid fa-arrow-right ml-3"></i>
                    </button>
                </div>
            </div>
        );
      case 'loading':
         return (
            <div className="flex flex-col items-center">
                 <div className="relative max-w-2xl mx-auto rounded-xl overflow-hidden shadow-2xl mb-8">
                    <img src={image!} alt="Analyserer billede" className="w-full h-auto object-cover opacity-50"/>
                 </div>
                 <Spinner message={progressMessage} />
            </div>
         );
      case 'results':
        return (
          <>
            <div className="mb-12">
              <div className="relative max-w-2xl mx-auto rounded-xl overflow-hidden shadow-2xl">
                <img src={image!} alt="Køleskab indhold" className="w-full h-auto object-cover"/>
                <button
                  onClick={resetState}
                  className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full h-10 w-10 flex items-center justify-center hover:bg-opacity-75 transition-opacity"
                  aria-label="Start forfra"
                >
                  <i className="fa-solid fa-redo text-lg"></i>
                </button>
              </div>
            </div>

            {error && (
                <div className="text-center my-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative max-w-2xl mx-auto" role="alert">
                    <strong className="font-bold">Hovsa! </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {ingredients.length > 0 && (
              <div className="max-w-4xl mx-auto mb-12">
                <h2 className="text-2xl font-bold text-center mb-4">Fundne Ingredienser</h2>
                <div className="flex flex-wrap justify-center gap-2">
                  {ingredients.map((item, index) => (
                    <span key={index} className="bg-emerald-100 text-emerald-800 text-sm font-medium px-3 py-1 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recipes.length > 0 && (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-8">Dine Personlige Opskrifter</h2>
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-8">
                  {recipes.map((recipe, index) => (
                    <RecipeCard key={index} recipe={recipe} />
                  ))}
                </div>
              </div>
            )}

            {ingredients.length > 0 && (
                <div className="text-center mt-12">
                    <button
                        onClick={handleRegenerateRecipes}
                        disabled={isRegenerating}
                        className="bg-white border-2 border-emerald-600 text-emerald-600 font-bold py-3 px-8 rounded-full hover:bg-emerald-50 transition-colors duration-300 text-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                    >
                        {isRegenerating ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Genererer...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-wand-magic-sparkles mr-3"></i>
                                Ikke helt det? Generer nye forslag
                            </>
                        )}
                    </button>
                </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={resetState} title="Start forfra">
                <i className="fa-solid fa-utensils text-3xl text-emerald-600"></i>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Køleskabs Kokken</h1>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
