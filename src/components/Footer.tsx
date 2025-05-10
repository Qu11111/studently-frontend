function Footer() {
  return (
    <footer className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3">
      <div className="container mx-auto text-center">
        <p>© 2025 studently. Все права защищены.</p>
        <div className="mt-4">
          <a href="#" className="text-gray-400 hover:text-white mx-2">О нас</a>
          <a href="#" className="text-gray-400 hover:text-white mx-2">Контакты</a>
          <a href="#" className="text-gray-400 hover:text-white mx-2">Политика</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;