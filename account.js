
import { supabase } from './supabase.js';

// Find the account buttons
const loginLink = document.getElementById('loginLink');
const signupLink = document.getElementById('signupLink');
const myAccountLink = document.getElementById('myAccountLink');
const logoutLink = document.getElementById('logoutLink');

// Check whether someone is logged in
async function checkLoginStatus() {

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
        console.error('Error checking login status:', error);
    }

    if (user) {

        // User is logged in
        loginLink.hidden = true;
        signupLink.hidden = true;
        myAccountLink.hidden = false;
        logoutLink.hidden = false;

    } else {

        // User is logged out
        loginLink.hidden = false;
        signupLink.hidden = false;
        myAccountLink.hidden = true;
        logoutLink.hidden = true;

    }
}


// Log out when the button is clicked
logoutLink.addEventListener('click', async function(event) {

    event.preventDefault();

    const { error } = await supabase.auth.signOut();

    if (error) {
        alert('Logout failed: ' + error.message);
        return;
    }

    window.location.reload();

});


// Run the login check
checkLoginStatus();
