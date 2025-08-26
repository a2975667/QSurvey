export const deepDiff = (obj1, obj2, parentKey = '') => {
  let diff = {};

  for (const key in obj1) {
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    if (typeof obj1[key] === 'object' && obj1[key] !== null && !Array.isArray(obj1[key])) {
      const nestedDiff = deepDiff(obj1[key], obj2[key] || {}, newKey);
      if (Object.keys(nestedDiff).length > 0) {
        diff[newKey] = nestedDiff;
      }
    } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      diff[newKey] = {
        old_value: obj1[key],
        new_value: obj2[key],
        diff: obj2[key] - obj1[key]
      };
    }
  }

  for (const key in obj2) {
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    if (obj1[key] === undefined) {
      diff[newKey] = {
        old_value: null,
        new_value: obj2[key],
        diff: obj2[key]
      };
    }
  }

  return diff;
};
