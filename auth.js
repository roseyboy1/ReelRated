
import { supabase } from './supabase.js';

const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async function (event) {

    event.preventDefault();

    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        alert('Registration failed: ' + error.message);
        return;
    }

    alert('Registration successful! Check your email to confirm your account.');

    signupForm.reset();

});
// Switch between login and signup forms

const loginBox = document.getElementById('loginBox');
const signupBox = document.getElementById('signupBox');

document.getElementById('showSignup').addEventListener('click', function(event) {
    event.preventDefault();

    loginBox.hidden = true;
    signupBox.hidden = false;
});

document.getElementById('showLogin').addEventListener('click', function(event) {
    event.preventDefault();

    signupBox.hidden = true;
    loginBox.hidden = false;
});

// Log in existing users

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async function(event) {

    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert('Login failed: ' + error.message);
        return;
    }

    alert('Welcome back to ReelRated!');

    window.location.href = 'index.html';

});