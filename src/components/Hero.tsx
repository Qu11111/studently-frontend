function Hero() {
  return (
    <section className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-16">
      <div className="container mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6">Добро пожаловать в studently!</h1>
        <p className="text-xl mb-8">Присоединяйтесь к сообществу, где вы можете поддерживать создателей и делиться своим творчеством.</p>
        <div className="flex justify-center gap-4">
        <button
          className="bg-white text-blue-600 font-semibold py-2 px-4 rounded hover:bg-gray-100"
          onClick={() => window.location.href = '/signup'}
        >
          Начать
        </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;