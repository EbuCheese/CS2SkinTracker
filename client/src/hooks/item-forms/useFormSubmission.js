import { useState, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';

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

// Maps context data types to database types
const CONTEXT_TYPE_MAP = {
  'skins': 'liquid',
  'cases': 'case',
  'stickers': 'sticker',
  'agents': 'agent',
  'keychains': 'keychain',
  'graffiti': 'graffiti',
  'patches': 'patch'
};

// User-friendly error messages for common database errors
const ERROR_MESSAGES = {
  'row-level security policy': 'Authentication error: Please refresh and re-enter your beta key.',
  'foreign key': 'User session error: Please refresh and re-enter your beta key.',
  'context': 'Authentication context error: Please try again or refresh the page.'
};

// Helper function to build detailed item names (same as in ItemCard)
const buildDetailedItemName = (item) => {
  let displayName = '';
  
  // Add variant prefix
  if (item.variant === 'souvenir') {
    displayName += 'Souvenir ';
  } else if (item.variant === 'stattrak') {
    displayName += 'StatTrak™ ';
  }
  
  // Add base name and skin name
  if (item.skin_name) {
    displayName += `${item.name || 'Custom'} ${item.skin_name}`;
  } else {
    displayName += item.name;
  }
  
  // Add condition in parentheses if present
  if (item.condition) {
    displayName += ` (${item.condition})`;
  }
  
  return displayName;
};

// Hook for handling form submission to add new investments
export const useFormSubmission = (supabase) => {
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

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
      
      // Ensure quantity is at least 1
      const quantity = Math.max(1, parseInt(formData.quantity));
      
      // Determine item type for database
      let itemType;
      
      // Priority 1: Use itemType from context data (when item selected from search)
      if (formData.itemType) {
        itemType = CONTEXT_TYPE_MAP[formData.itemType] || formData.itemType;
      }
      // Priority 2: Use category mapping (for tab-based selection)
      else if (currentCategory && currentCategory !== 'All') {
        itemType = TYPE_MAP[currentCategory] || currentCategory.toLowerCase();
      }
      // Fallback (should rarely happen)
      else {
        itemType = 'liquid';
      }
      
      // Construct investment object for database insertion
      const newInvestment = {
        user_id: userSession.id,
        type: itemType,
        name: formData.name.trim(),
        skin_name: formData.skin_name?.trim() || null,
        condition: formData.condition?.trim() || null,
        variant: formData.variant || 'normal',
        buy_price: buyPrice,
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
      
      // Build detailed name for toast
      const detailedName = buildDetailedItemName(insertData);

      // Show success toast using the enhanced method
      toast.itemAdded(detailedName, insertData.quantity, insertData.buy_price);

      // Update UI and close modal on success
      onAdd(insertData);
      onClose();

    } catch (err) {
      console.error('Error adding investment:', err);
      
      // Show user-friendly error message based on error type
      const errorType = Object.keys(ERROR_MESSAGES).find(key => err.message.includes(key));
      const errorMessage = errorType ? ERROR_MESSAGES[errorType] : `Failed to add investment: ${err.message}`;

      toast.error(errorMessage, 'Failed to Add Item');
      alert(errorType ? ERROR_MESSAGES[errorType] : `Failed to add investment: ${err.message}`);

    } finally {
      setSubmitting(false);
    }
  }, [supabase, toast]);

  return {
    submitting,
    handleSubmit
  };
};