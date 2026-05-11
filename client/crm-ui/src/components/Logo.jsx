import React from 'react';
import logoImg from '../assets/logo-idea-fueled.png';

const Logo = ({ className = "w-10 h-10" }) => {
    return (
        <img 
            src={logoImg} 
            alt="Idea Fueled Logo" 
            className={`${className} object-contain`}
        />
    );
};

export default Logo;
