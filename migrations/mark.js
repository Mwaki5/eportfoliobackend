"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Marks", {
      markId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      studentId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "Users",
          key: "userId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      unitCode: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "Units",
          key: "unitCode",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      theory1: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      theory2: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      theory3: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      prac1: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      prac2: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      prac3: {
        type: Sequelize.INTEGER,
        allowNull: true,
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
    await queryInterface.dropTable("Marks");
  },
};
