// adOptimizer.js
const { Configuration, OpenAIApi } = require('openai');
const { OPENAI_API_KEY } = require('./config');

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

async function optimizeAdText(adText) {
  try {
    const prompt = `Improve the following ad text for better engagement: "${adText}"`;
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 50,
      temperature: 0.7
    });
    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error optimizing ad text:', error);
    return adText;
  }
}

module.exports = {
  optimizeAdText
};
