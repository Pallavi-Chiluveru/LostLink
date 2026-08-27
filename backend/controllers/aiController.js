const AIService = require('../services/AIService');

exports.suggestQuestions = async (req, res) => {
  try {
    const { category, brand, itemName, description } = req.body;
    const suggestions = await AIService.generateVerificationQuestions({
      category,
      brand,
      itemName,
      description
    });
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: 'Server error generating suggested questions.' });
  }
};
