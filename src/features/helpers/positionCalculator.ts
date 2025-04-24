import { IQsOption } from "../../types/coreTypes";

/**
 * Helper functions for calculating and maintaining positions of items
 * within and across categories.
 */

/**
 * Calculate global positions for all options based on their category assignments
 * and positions within categories.
 * 
 * @param categories The sequence of categories to calculate positions for
 * @param positions The mapping of categories to option IDs
 * @param optionsById The options dictionary keyed by ID
 * @returns Updated options with corrected position values
 */
export const calculateGlobalPositions = (
  categories: string[],
  positions: { [key: string]: string[] },
  optionsById: { [key: string]: IQsOption }
): { [key: string]: IQsOption } => {
  // Create a copy of the options to update
  const updatedOptions = { ...optionsById };
  let cumulativePosition = 0;
  
  // Process each category in the specified order
  categories.forEach((category) => {
    const categoryOptions = positions[category] || [];
    
    // Update each option's position
    categoryOptions.forEach((optionId, index) => {
      if (updatedOptions[optionId]) {
        // The group-specific position is the index within the category
        updatedOptions[optionId].groupPosition = index;
        
        // The global position is the cumulative index across all categories
        updatedOptions[optionId].position = cumulativePosition + index;
      }
    });
    
    // Increment the cumulative position for the next category
    cumulativePosition += categoryOptions.length;
  });
  
  return updatedOptions;
};

/**
 * Move an option from one category to another and recalculate positions.
 * 
 * @param optionId The ID of the option to move
 * @param sourceCategory The current category of the option
 * @param targetCategory The target category for the option
 * @param newPosition The position within the target category
 * @param positions The current category-to-options mapping
 * @returns Updated positions after the move
 */
export const moveOption = (
  optionId: string,
  sourceCategory: string,
  targetCategory: string,
  newPosition: number,
  positions: { [key: string]: string[] }
): { [key: string]: string[] } => {
  // Create a deep copy of the positions
  const updatedPositions = Object.entries(positions).reduce((acc, [key, value]) => {
    acc[key] = [...value];
    return acc;
  }, {} as { [key: string]: string[] });
  
  // Remove the option from the source category
  if (updatedPositions[sourceCategory]) {
    const sourceIndex = updatedPositions[sourceCategory].indexOf(optionId);
    if (sourceIndex !== -1) {
      updatedPositions[sourceCategory].splice(sourceIndex, 1);
    }
  }
  
  // Ensure the target category exists
  if (!updatedPositions[targetCategory]) {
    updatedPositions[targetCategory] = [];
  }
  
  // Add the option to the target category at the specified position
  updatedPositions[targetCategory].splice(
    Math.min(newPosition, updatedPositions[targetCategory].length),
    0,
    optionId
  );
  
  return updatedPositions;
};

/**
 * Merge options from one category into another.
 * 
 * @param sourceCategory The category to merge from
 * @param targetCategory The category to merge into
 * @param positions The current category-to-options mapping
 * @returns Updated positions after the merge
 */
export const mergeCategories = (
  sourceCategory: string,
  targetCategory: string,
  positions: { [key: string]: string[] }
): { [key: string]: string[] } => {
  // Create a deep copy of the positions
  const updatedPositions = Object.entries(positions).reduce((acc, [key, value]) => {
    acc[key] = [...value];
    return acc;
  }, {} as { [key: string]: string[] });
  
  // Ensure both categories exist
  if (!updatedPositions[sourceCategory]) {
    updatedPositions[sourceCategory] = [];
  }
  
  if (!updatedPositions[targetCategory]) {
    updatedPositions[targetCategory] = [];
  }
  
  // Add all options from source to target
  updatedPositions[targetCategory] = [
    ...updatedPositions[targetCategory],
    ...updatedPositions[sourceCategory]
  ];
  
  // Clear the source category
  updatedPositions[sourceCategory] = [];
  
  return updatedPositions;
};