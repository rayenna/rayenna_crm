// Location data for India (primary focus) and other countries
// States and cities are organized by country

export interface Country {
  code: string;
  name: string;
}

export interface State {
  code: string;
  name: string;
  countryCode: string;
}

export interface City {
  name: string;
  stateCode: string;
  countryCode: string;
}

// Countries
export const countries: Country[] = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'NP', name: 'Nepal' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'MV', name: 'Maldives' },
];

// Indian States
export const indianStates: State[] = [
  { code: 'AP', name: 'Andhra Pradesh', countryCode: 'IN' },
  { code: 'AR', name: 'Arunachal Pradesh', countryCode: 'IN' },
  { code: 'AS', name: 'Assam', countryCode: 'IN' },
  { code: 'BR', name: 'Bihar', countryCode: 'IN' },
  { code: 'CT', name: 'Chhattisgarh', countryCode: 'IN' },
  { code: 'GA', name: 'Goa', countryCode: 'IN' },
  { code: 'GJ', name: 'Gujarat', countryCode: 'IN' },
  { code: 'HR', name: 'Haryana', countryCode: 'IN' },
  { code: 'HP', name: 'Himachal Pradesh', countryCode: 'IN' },
  { code: 'JK', name: 'Jammu and Kashmir', countryCode: 'IN' },
  { code: 'JH', name: 'Jharkhand', countryCode: 'IN' },
  { code: 'KA', name: 'Karnataka', countryCode: 'IN' },
  { code: 'KL', name: 'Kerala', countryCode: 'IN' },
  { code: 'MP', name: 'Madhya Pradesh', countryCode: 'IN' },
  { code: 'MH', name: 'Maharashtra', countryCode: 'IN' },
  { code: 'MN', name: 'Manipur', countryCode: 'IN' },
  { code: 'ML', name: 'Meghalaya', countryCode: 'IN' },
  { code: 'MZ', name: 'Mizoram', countryCode: 'IN' },
  { code: 'NL', name: 'Nagaland', countryCode: 'IN' },
  { code: 'OR', name: 'Odisha', countryCode: 'IN' },
  { code: 'PB', name: 'Punjab', countryCode: 'IN' },
  { code: 'RJ', name: 'Rajasthan', countryCode: 'IN' },
  { code: 'SK', name: 'Sikkim', countryCode: 'IN' },
  { code: 'TN', name: 'Tamil Nadu', countryCode: 'IN' },
  { code: 'TG', name: 'Telangana', countryCode: 'IN' },
  { code: 'TR', name: 'Tripura', countryCode: 'IN' },
  { code: 'UP', name: 'Uttar Pradesh', countryCode: 'IN' },
  { code: 'UT', name: 'Uttarakhand', countryCode: 'IN' },
  { code: 'WB', name: 'West Bengal', countryCode: 'IN' },
  { code: 'DL', name: 'Delhi', countryCode: 'IN' },
  { code: 'PY', name: 'Puducherry', countryCode: 'IN' },
];

// Major Indian Cities (organized by state)
export const indianCities: City[] = [
  // Andhra Pradesh
  { name: 'Hyderabad', stateCode: 'AP', countryCode: 'IN' },
  { name: 'Visakhapatnam', stateCode: 'AP', countryCode: 'IN' },
  { name: 'Vijayawada', stateCode: 'AP', countryCode: 'IN' },
  { name: 'Guntur', stateCode: 'AP', countryCode: 'IN' },
  { name: 'Nellore', stateCode: 'AP', countryCode: 'IN' },
  
  // Karnataka
  { name: 'Bangalore', stateCode: 'KA', countryCode: 'IN' },
  { name: 'Mysore', stateCode: 'KA', countryCode: 'IN' },
  { name: 'Hubli', stateCode: 'KA', countryCode: 'IN' },
  { name: 'Mangalore', stateCode: 'KA', countryCode: 'IN' },
  { name: 'Belgaum', stateCode: 'KA', countryCode: 'IN' },
  
  // Kerala
  { name: 'Kochi', stateCode: 'KL', countryCode: 'IN' },
  { name: 'Thiruvananthapuram', stateCode: 'KL', countryCode: 'IN' },
  { name: 'Kozhikode', stateCode: 'KL', countryCode: 'IN' },
  { name: 'Thrissur', stateCode: 'KL', countryCode: 'IN' },
  { name: 'Kannur', stateCode: 'KL', countryCode: 'IN' },
  { name: 'Kollam', stateCode: 'KL', countryCode: 'IN' },
  { name: 'Alappuzha', stateCode: 'KL', countryCode: 'IN' },
  { name: 'Palakkad', stateCode: 'KL', countryCode: 'IN' },
  { name: 'Ernakulam', stateCode: 'KL', countryCode: 'IN' },
  { name: 'Malappuram', stateCode: 'KL', countryCode: 'IN' },
  
  // Tamil Nadu
  { name: 'Chennai', stateCode: 'TN', countryCode: 'IN' },
  { name: 'Coimbatore', stateCode: 'TN', countryCode: 'IN' },
  { name: 'Madurai', stateCode: 'TN', countryCode: 'IN' },
  { name: 'Tiruchirappalli', stateCode: 'TN', countryCode: 'IN' },
  { name: 'Salem', stateCode: 'TN', countryCode: 'IN' },
  
  // Maharashtra
  { name: 'Mumbai', stateCode: 'MH', countryCode: 'IN' },
  { name: 'Pune', stateCode: 'MH', countryCode: 'IN' },
  { name: 'Nagpur', stateCode: 'MH', countryCode: 'IN' },
  { name: 'Nashik', stateCode: 'MH', countryCode: 'IN' },
  { name: 'Aurangabad', stateCode: 'MH', countryCode: 'IN' },
  
  // Gujarat
  { name: 'Ahmedabad', stateCode: 'GJ', countryCode: 'IN' },
  { name: 'Surat', stateCode: 'GJ', countryCode: 'IN' },
  { name: 'Vadodara', stateCode: 'GJ', countryCode: 'IN' },
  { name: 'Rajkot', stateCode: 'GJ', countryCode: 'IN' },
  { name: 'Bhavnagar', stateCode: 'GJ', countryCode: 'IN' },
  
  // Delhi
  { name: 'New Delhi', stateCode: 'DL', countryCode: 'IN' },
  { name: 'Delhi', stateCode: 'DL', countryCode: 'IN' },
  
  // West Bengal
  { name: 'Kolkata', stateCode: 'WB', countryCode: 'IN' },
  { name: 'Howrah', stateCode: 'WB', countryCode: 'IN' },
  { name: 'Durgapur', stateCode: 'WB', countryCode: 'IN' },
  
  // Uttar Pradesh
  { name: 'Lucknow', stateCode: 'UP', countryCode: 'IN' },
  { name: 'Kanpur', stateCode: 'UP', countryCode: 'IN' },
  { name: 'Agra', stateCode: 'UP', countryCode: 'IN' },
  { name: 'Varanasi', stateCode: 'UP', countryCode: 'IN' },
  { name: 'Allahabad', stateCode: 'UP', countryCode: 'IN' },
  
  // Rajasthan
  { name: 'Jaipur', stateCode: 'RJ', countryCode: 'IN' },
  { name: 'Jodhpur', stateCode: 'RJ', countryCode: 'IN' },
  { name: 'Udaipur', stateCode: 'RJ', countryCode: 'IN' },
  { name: 'Kota', stateCode: 'RJ', countryCode: 'IN' },
  
  // Punjab
  { name: 'Chandigarh', stateCode: 'PB', countryCode: 'IN' },
  { name: 'Ludhiana', stateCode: 'PB', countryCode: 'IN' },
  { name: 'Amritsar', stateCode: 'PB', countryCode: 'IN' },
  { name: 'Jalandhar', stateCode: 'PB', countryCode: 'IN' },
  
  // Haryana
  { name: 'Gurgaon', stateCode: 'HR', countryCode: 'IN' },
  { name: 'Faridabad', stateCode: 'HR', countryCode: 'IN' },
  { name: 'Panipat', stateCode: 'HR', countryCode: 'IN' },
  
  // Madhya Pradesh
  { name: 'Bhopal', stateCode: 'MP', countryCode: 'IN' },
  { name: 'Indore', stateCode: 'MP', countryCode: 'IN' },
  { name: 'Gwalior', stateCode: 'MP', countryCode: 'IN' },
  { name: 'Jabalpur', stateCode: 'MP', countryCode: 'IN' },
  
  // Odisha
  { name: 'Bhubaneswar', stateCode: 'OR', countryCode: 'IN' },
  { name: 'Cuttack', stateCode: 'OR', countryCode: 'IN' },
  { name: 'Rourkela', stateCode: 'OR', countryCode: 'IN' },
  
  // Telangana
  { name: 'Hyderabad', stateCode: 'TG', countryCode: 'IN' },
  { name: 'Warangal', stateCode: 'TG', countryCode: 'IN' },
  { name: 'Nizamabad', stateCode: 'TG', countryCode: 'IN' },
  
  // Puducherry
  { name: 'Puducherry', stateCode: 'PY', countryCode: 'IN' },
  { name: 'Karaikal', stateCode: 'PY', countryCode: 'IN' },
  { name: 'Mahe', stateCode: 'PY', countryCode: 'IN' },
];

// Helper functions
export const getStatesByCountry = (countryCode: string): State[] => {
  if (countryCode === 'IN') {
    return indianStates;
  }
  // For other countries, return empty array (can be extended later)
  return [];
};

export const getCitiesByState = (stateCode: string, countryCode: string): City[] => {
  if (countryCode === 'IN') {
    return indianCities.filter(city => city.stateCode === stateCode);
  }
  // For other countries, return empty array (can be extended later)
  return [];
};

export const getStateByCode = (stateCode: string): State | undefined => {
  return indianStates.find(state => state.code === stateCode);
};

export const getCityByName = (cityName: string, stateCode: string): City | undefined => {
  return indianCities.find(city => city.name === cityName && city.stateCode === stateCode);
};
