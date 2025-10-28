
import React from 'react';
import type { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-300">
      <div className="p-6">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">{recipe.title}</h3>
        <p className="text-slate-600 mb-4">{recipe.description}</p>
        
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-slate-700 mb-2">Ingredienser</h4>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="text-lg font-semibold text-slate-700 mb-2">Fremgangsmåde</h4>
          <ol className="list-decimal list-inside space-y-2 text-slate-600">
            {recipe.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
