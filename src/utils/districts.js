// src/utils/districts.js
// Andhra Pradesh: 28 districts (post Dec 2025 reorganization — added Markapuram & Polavaram).
// Telangana: 33 districts (since the 2016 reorganization).
export const DISTRICTS = {
  'Andhra Pradesh': [
    'Srikakulam', 'Parvathipuram Manyam', 'Vizianagaram', 'Visakhapatnam', 'Anakapalli',
    'Alluri Sitharama Raju', 'Kakinada', 'East Godavari', 'Dr. B.R. Ambedkar Konaseema',
    'West Godavari', 'Eluru', 'Krishna', 'NTR', 'Guntur', 'Palnadu', 'Bapatla',
    'Prakasam', 'Markapuram', 'Nellore', 'Kurnool', 'Nandyal', 'Anantapur',
    'Sri Sathya Sai', 'YSR Kadapa', 'Annamayya', 'Chittoor', 'Tirupati', 'Polavaram'
  ],
  'Telangana': [
    'Hyderabad', 'Medchal-Malkajgiri', 'Rangareddy', 'Vikarabad', 'Sangareddy',
    'Siddipet', 'Medak', 'Kamareddy', 'Nizamabad', 'Jagtial', 'Rajanna Sircilla',
    'Karimnagar', 'Peddapalli', 'Mancherial', 'Adilabad', 'Nirmal',
    'Komaram Bheem Asifabad', 'Jayashankar Bhupalpally', 'Warangal', 'Hanumakonda',
    'Jangaon', 'Mahabubabad', 'Bhadradri Kothagudem', 'Khammam', 'Mulugu',
    'Suryapet', 'Nalgonda', 'Yadadri Bhuvanagiri', 'Mahabubnagar', 'Nagarkurnool',
    'Wanaparthy', 'Jogulamba Gadwal', 'Narayanpet'
  ]
}

export const ALL_DISTRICTS = Object.values(DISTRICTS).flat()
