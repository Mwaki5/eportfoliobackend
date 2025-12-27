"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Units", {
      unitCode: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
      },
      unitName: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
      },

      staffId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "Users",
          key: "userId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Units");
  },
};
