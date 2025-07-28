import { useState, useCallback } from 'react';

// Maps category names to database type identifiers
const TYPE_MAP = {
  'Liquids': 'liquid',
  'Cases': 'case', 
  'Crafts': 'craft',
  'Agents': 'agent',
  'Stickers': 'sticker',
  'Keychains': 'keychain',
  'Graffiti': 'graffiti',
  'Patches': 'patch'
};

// User-friendly error messages for common database errors
const ERROR_MESSAGES = {
  'row-level security policy': 'Authentication error: Please refresh and re-enter your beta key.',
  'foreign key': 'User session error: Please refresh and re-enter your beta key.',
  'context': 'Authentication context error: Please try again or refresh the page.'
};

// Hook for handling form submission to add new investments
export const useFormSubmission = (supabase) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async (formData, userSession, currentCategory, onAdd, onClose) => {
    // Validate user session before proceeding
    if (!userSession?.id) {
      alert('No user session found');
      return;
    }

    try {
      setSubmitting(true);

      // Parse and validate buy price
      const buyPrice = parseFloat(formData.buy_price);
      
      // Generate realistic current price with 20% variation (±20%)
      const priceVariation = (Math.random() * 0.4 - 0.2);
      const currentPrice = Math.max(0.01, buyPrice * (1 + priceVariation));

      // Ensure quantity is at least 1
      const quantity = Math.max(1, parseInt(formData.quantity));
      
      // Map category to database type or use lowercase category
      const itemType = TYPE_MAP[currentCategory] || currentCategory?.toLowerCase();
      
      // Construct investment object for database insertion
      const newInvestment = {
        user_id: userSession.id,
        type: itemType,
        name: formData.name.trim(),
        skin_name: formData.skin_name?.trim() || null,
        condition: formData.condition?.trim() || null,
        variant: formData.variant || 'normal',
        buy_price: buyPrice,
        current_price: currentPrice,
        quantity: quantity,
        image_url: formData.custom_image_url || formData.image_url || null,
        notes: formData.notes?.trim() || null
      };

      // Use RPC function to insert with proper context
      const { data: insertData, error: insertError } = await supabase.rpc('insert_investment_with_context', {
        investment_data: newInvestment,
        context_user_id: userSession.id
      });

      if (insertError) throw insertError;
      
      // Update UI and close modal on success
      onAdd(insertData);
      onClose();

    } catch (err) {
      console.error('Error adding investment:', err);
      
      // Show user-friendly error message based on error type
      const errorType = Object.keys(ERROR_MESSAGES).find(key => err.message.includes(key));
      alert(errorType ? ERROR_MESSAGES[errorType] : `Failed to add investment: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }, [supabase]);

  return {
    submitting,
    handleSubmit
  };
};
